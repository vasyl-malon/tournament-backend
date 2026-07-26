import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { MatchStatus, TournamentStatus } from '@prisma/client';
import { GetTeamsResponse, MatchDuration, MatchStage } from './types';
import {
  DIFF_SCORE_POINTS,
  EXACT_SCORE_POINTS,
  RESULT_SCORE_POINTS,
  WINNER_POINTS,
} from './constants';

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(FootballSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async callExternalFootballApi<T>(url: string) {
    const { data } = await firstValueFrom(
      this.httpService.get<T>(`${process.env.BASE_URL}${url}`, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN ?? '',
        },
      }),
    );

    return data;
  }

  private async ensureTeamExists(apiTeam: any, tournamentId: string) {
    if (!apiTeam || !apiTeam.id) return;

    await this.prisma.team.upsert({
      where: { id: apiTeam.id },
      update: {},
      create: {
        id: apiTeam.id,
        name: apiTeam.shortName ?? apiTeam.name,
        code: apiTeam.tla ?? 'TBA',
        logo: apiTeam.crest ?? '',
      },
    });

    await this.prisma.tournamentTeam.upsert({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId: apiTeam.id,
        },
      },
      update: {},
      create: {
        tournamentId,
        teamId: apiTeam.id,
      },
    });
  }

  private calculatePoints(
    predHome: number,
    predAway: number,
    actualHome: number,
    actualAway: number,
  ): number {
    const predDiff = predHome - predAway;
    const actualDiff = actualHome - actualAway;
    if (predHome === actualHome && predAway === actualAway) return EXACT_SCORE_POINTS;
    if (predDiff === actualDiff) return DIFF_SCORE_POINTS;
    if (Math.sign(predDiff) === Math.sign(actualDiff)) return RESULT_SCORE_POINTS;

    return 0;
  }

  private async syncTournamentTeamsAndPlayers(tournament: {
    id: string;
    name: string;
    apiCode: string;
  }) {
    this.logger.log(`Fetching teams for tournament: ${tournament.name}`);

    const data = await this.callExternalFootballApi<GetTeamsResponse>(
      `/competitions/${tournament.apiCode}/teams`,
    );

    for (const team of data.teams) {
      await this.prisma.$transaction(async (tx) => {
        await tx.team.upsert({
          where: { id: team.id },
          update: {
            name: team.shortName,
            code: team.tla,
            logo: team.crest,
          },
          create: {
            id: team.id,
            name: team.shortName,
            code: team.tla,
            logo: team.crest,
          },
        });

        await tx.tournamentTeam.upsert({
          where: {
            tournamentId_teamId: {
              tournamentId: tournament.id,
              teamId: team.id,
            },
          },
          update: {},
          create: {
            tournamentId: tournament.id,
            teamId: team.id,
          },
        });

        const squad = team.squad ?? [];
        if (squad.length === 0) return;

        await Promise.all(
          squad.map((player) =>
            tx.player.upsert({
              where: { id: player.id },
              update: {
                name: player.name,
                position: player.position ?? 'Unknown',
                dateOfBirth: player.dateOfBirth,
                nationality: player.nationality,
                teamId: team.id,
              },
              create: {
                id: player.id,
                name: player.name,
                position: player.position ?? 'Unknown',
                dateOfBirth: player.dateOfBirth,
                nationality: player.nationality,
                teamId: team.id,
              },
            }),
          ),
        );

        const tournamentPlayerData = squad.map((player) => ({
          tournamentId: tournament.id,
          playerId: player.id,
        }));

        await tx.tournamentPlayer.createMany({
          data: tournamentPlayerData,
          skipDuplicates: true,
        });
      });
    }
    this.logger.log(`Successfully synced teams and players for tournament: ${tournament.name}`);
  }

  private async syncTournamentMatchesData(tournament: {
    id: string;
    name: string;
    apiCode: string;
  }) {
    this.logger.log(`Fetching matches for tournament: ${tournament.name}`);

    const { matches } = await this.callExternalFootballApi<any>(
      `/competitions/${tournament.apiCode}/matches`,
    );

    if (!matches || matches.length === 0) return;

    for (const m of matches) {
      await this.ensureTeamExists(m.homeTeam, tournament.id);
      await this.ensureTeamExists(m.awayTeam, tournament.id);

      const mappedStatus = this.mapMatchStatus(m.status);
      const apiMatchId = String(m.id);

      const { home: homeScore, away: awayScore } = this.extractPlayingScore(m.score);
      const homeScorePen = m.score?.penalties?.home ?? null;
      const awayScorePen = m.score?.penalties?.away ?? null;
      const duration = m.score?.duration ?? null;

      const dbMatch = await this.prisma.match.findUnique({
        where: { apiMatchId },
        include: { bets: true },
      });

      let advancingTeamId: number | null = null;
      const isKnockout = m.stage && m.stage !== 'GROUP_STAGE' && m.stage !== 'LEAGUE_PHASE';

      if (mappedStatus === 'FINISHED' && isKnockout) {
        advancingTeamId = await this.getAdvancingTeam(m, tournament.id);
      }

      if (!dbMatch) {
        await this.prisma.match.create({
          data: {
            apiMatchId,
            tournamentId: tournament.id,
            homeTeamId: m.homeTeam.id,
            awayTeamId: m.awayTeam.id,
            startTime: new Date(m.utcDate),
            status: mappedStatus,
            homeScore,
            awayScore,
            homeScorePen,
            awayScorePen,
            duration,
            advancingTeamId,
            stage: m.stage,
            group: m.group ?? null,
            matchday: m.matchday ?? null,
          },
        });
      } else {
        if (mappedStatus === MatchStatus.FINISHED && dbMatch.status !== MatchStatus.FINISHED) {
          this.logger.log(
            `Calculate points for the match ${m.homeTeam.shortName} - ${m.awayTeam.shortName} ...`,
          );

          const transactionOperations: any[] = [];

          transactionOperations.push(
            this.prisma.match.update({
              where: { apiMatchId },
              data: {
                status: mappedStatus,
                homeScore,
                awayScore,
                homeScorePen,
                awayScorePen,
                duration,
                advancingTeamId,
                startTime: new Date(m.utcDate),
              },
            }),
          );

          for (const bet of dbMatch.bets) {
            const points = this.calculatePoints(
              bet.homeScore,
              bet.awayScore,
              homeScore ?? 0,
              awayScore ?? 0,
            );

            const advPoints =
              advancingTeamId && bet.predictedAdvancingTeamId === advancingTeamId
                ? WINNER_POINTS
                : 0;

            transactionOperations.push(
              this.prisma.bet.update({
                where: { id: bet.id },
                data: {
                  pointsEarned: points,
                  advancingPointsEarned: advPoints,
                },
              }),
            );
          }

          if (advancingTeamId) {
            const firstLeg = await this.prisma.match.findFirst({
              where: {
                tournamentId: tournament.id,
                stage: m.stage,
                homeTeamId: m.awayTeam.id,
                awayTeamId: m.homeTeam.id,
                status: MatchStatus.FINISHED,
              },
              include: { bets: true },
            });

            if (firstLeg && !firstLeg.advancingTeamId) {
              transactionOperations.push(
                this.prisma.match.update({
                  where: { id: firstLeg.id },
                  data: { advancingTeamId },
                }),
              );

              for (const firstLegBet of firstLeg.bets) {
                if (firstLegBet.predictedAdvancingTeamId === advancingTeamId) {
                  transactionOperations.push(
                    this.prisma.bet.update({
                      where: { id: firstLegBet.id },
                      data: { advancingPointsEarned: 1 },
                    }),
                  );
                }
              }
            }
          }

          await this.prisma.$transaction(transactionOperations);
        } else {
          await this.prisma.match.update({
            where: { apiMatchId },
            data: {
              status: mappedStatus,
              homeScore,
              awayScore,
              homeScorePen,
              awayScorePen,
              duration,
              startTime: new Date(m.utcDate),
            },
          });
        }
      }
    }
    this.logger.log(`Matches were updated for the tournament ${tournament.name}`);
  }

  async manualSyncTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    try {
      await this.syncTournamentTeamsAndPlayers(tournament);
      await this.syncTournamentMatchesData(tournament);

      return {
        success: true,
        message: `Tournament "${tournament.name}" successfully synchronized`,
      };
    } catch (error) {
      this.logger.error(`Manual sync failed for tournament ${tournament.name}`, error.message);
      throw error;
    }
  }

  @Cron('0 3 * * *')
  async syncTeamsAndPlayers() {
    const tournaments = await this.prisma.tournament.findMany({
      where: { status: { in: [TournamentStatus.ONGOING, TournamentStatus.FINISHED] } },
    });

    for (const tournament of tournaments) {
      try {
        await this.syncTournamentTeamsAndPlayers(tournament);
      } catch (error) {
        this.logger.error(`Failed to sync tournament teams ${tournament.name}`, error);
      }
    }
  }

  @Cron('*/5 * * * *')
  async handleMatchSync() {
    const tournaments = await this.prisma.tournament.findMany({
      where: { status: { in: ['UPCOMING', 'ONGOING'] } },
    });

    for (const tournament of tournaments) {
      try {
        await this.syncTournamentMatchesData(tournament);
      } catch (error) {
        this.logger.error(`Error for the tournament ${tournament.name}:`, error.message);
      }
    }
  }

  private mapMatchStatus(apiStatus: string): MatchStatus {
    switch (apiStatus) {
      case 'IN_PLAY':
      case 'PAUSED':
        return MatchStatus.LIVE;
      case 'FINISHED':
      case 'AWARDED':
        return MatchStatus.FINISHED;
      case 'SCHEDULED':
      case 'TIMED':
      case 'POSTPONED':
      case 'SUSPENDED':
      default:
        return MatchStatus.SCHEDULED;
    }
  }

  private extractPlayingScore(scoreData: any): { home: number | null; away: number | null } {
    if (!scoreData?.fullTime) return { home: null, away: null };

    let home = scoreData.fullTime.home;
    let away = scoreData.fullTime.away;

    if (scoreData.duration === MatchDuration.PENALTY_SHOOTOUT && scoreData.penalties) {
      home -= scoreData.penalties.home ?? 0;
      away -= scoreData.penalties.away ?? 0;
    }

    return { home, away };
  }

  private async getAdvancingTeam(apiMatch: any, tournamentId: string): Promise<number | null> {
    const duration = apiMatch.score?.duration;
    const winnerEnum = apiMatch.score?.winner;

    if (duration === MatchDuration.EXTRA_TIME || duration === MatchDuration.PENALTY_SHOOTOUT) {
      return winnerEnum === 'HOME_TEAM' ? apiMatch.homeTeam.id : apiMatch.awayTeam.id;
    }

    if (apiMatch.stage === MatchStage.FINAL || apiMatch.stage === MatchStage.THIRD_PLACE) {
      if (winnerEnum === 'HOME_TEAM') return apiMatch.homeTeam.id;
      if (winnerEnum === 'AWAY_TEAM') return apiMatch.awayTeam.id;
      return null;
    }

    const firstLeg = await this.prisma.match.findFirst({
      where: {
        tournamentId,
        stage: apiMatch.stage,
        homeTeamId: apiMatch.awayTeam.id,
        awayTeamId: apiMatch.homeTeam.id,
        status: MatchStatus.FINISHED,
      },
    });

    if (firstLeg) {
      const leg2HomeGoals = apiMatch.score?.fullTime?.home ?? 0;
      const leg2AwayGoals = apiMatch.score?.fullTime?.away ?? 0;
      const leg1HomeGoals = firstLeg.homeScore ?? 0;
      const leg1AwayGoals = firstLeg.awayScore ?? 0;

      const aggHome = leg2HomeGoals + leg1AwayGoals;
      const aggAway = leg2AwayGoals + leg1HomeGoals;

      if (aggHome > aggAway) return apiMatch.homeTeam.id;
      if (aggAway > aggHome) return apiMatch.awayTeam.id;

      return null;
    }

    return null;
  }
}
