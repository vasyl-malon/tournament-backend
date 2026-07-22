import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { MatchStatus } from '@prisma/client';
import { GetMatchesResponse, GetTeamsResponse } from './types';

const BASE_URL = 'https://api.football-data.org/v4';
const EXACT_SCORE_POINTS = 3;
const DIFF_SCORE_POINTS = 2;
const RESULT_SCORE_POINTS = 1;
const WINNER_POINTS = 1;

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(FootballSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async callExternalFootballApi<T>(url: string) {
    const { data } = await firstValueFrom(
      this.httpService.get<T>(`${BASE_URL}${url}`, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN ?? '',
        },
      }),
    );

    return data;
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

  @Cron('0 3 * * *')
  async syncTeamsAndPlayers() {
    this.logger.log('🚀 Starting teams and players synchronization...');

    const tournaments = await this.prisma.tournament.findMany({
      where: { status: { in: ['ONGOING', 'FINISHED'] } },
    });

    for (const tournament of tournaments) {
      try {
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

          this.logger.log(`Synced ${team.squad?.length ?? 0} players for ${team.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to sync tournament ${tournament.name}`, error);
      }
    }
  }

  // @Cron('*/10 * * * *')
  async handleMatchSync() {
    this.logger.log('Starting matches synchronization...');

    const tournaments = await this.prisma.tournament.findMany({
      where: { status: { in: ['UPCOMING', 'ONGOING', 'FINISHED'] } },
    });

    for (const tournament of tournaments) {
      try {
        this.logger.log(`Fetching matches for tournament: ${tournament.name}`);

        const { matches } = await this.callExternalFootballApi<any>(
          `/competitions/${tournament.apiCode}/matches`,
        );

        if (!matches || matches.length === 0) continue;

        for (const m of matches) {
          const mappedStatus = this.mapMatchStatus(m.status);
          const apiMatchId = String(m.id);

          // Calculate the clear score
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
            if (mappedStatus === 'FINISHED' && dbMatch.status !== 'FINISHED') {
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
                  advancingTeamId && bet.predictedAdvancingTeamId === advancingTeamId ? 1 : 0;

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
                    status: 'FINISHED',
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

    if (scoreData.duration === 'PENALTY_SHOOTOUT' && scoreData.penalties) {
      home -= scoreData.penalties.home ?? 0;
      away -= scoreData.penalties.away ?? 0;
    }

    return { home, away };
  }

  private async getAdvancingTeam(apiMatch: any, tournamentId: string): Promise<number | null> {
    const duration = apiMatch.score?.duration;
    const winnerEnum = apiMatch.score?.winner; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW"

    if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
      return winnerEnum === 'HOME_TEAM' ? apiMatch.homeTeam.id : apiMatch.awayTeam.id;
    }

    if (apiMatch.stage === 'FINAL' || apiMatch.stage === 'THIRD_PLACE') {
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
        status: 'FINISHED',
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

  // @Cron(CronExpression.EVERY_MINUTE)
  // async handleDailySync() {
  //   this.logger.log('🚀 Початок щоденної синхронізації ліг та бомбардирів...');

  //   // Отримуємо список усіх турнірів, які активовані у нашій базі даних
  //   const tournaments = await this.prisma.tournament.findMany();

  //   for (const tournament of tournaments) {
  //     try {
  //       this.logger.log(`🔄 Синхронізація для турніру: ${tournament.name} (${tournament.apiCode})`);

  //       // 1. Оновлюємо турнірну таблицю
  //       await this.syncStandings(tournament.id, tournament.apiCode);

  //       // 2. Оновлюємо топ-бомбардирів
  //       await this.syncTopScorers(tournament.id, tournament.apiCode);
  //     } catch (error) {
  //       this.logger.error(`❌ Помилка синхронізації турніру ${tournament.apiCode}:`, error.message);
  //     }
  //   }

  //   this.logger.log('✅ Щоденну синхронізацію успішно завершено!');
  // }

  // МЕТОД ДЛЯ СИНХРОНІЗАЦІЇ ТУРНІРНОЇ ТАБЛИЦІ
  private async syncStandings(tournamentId: string, apiCode: string) {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_TOKEN');
    const url = `https://api.football-data.org/v4/competitions/${apiCode}/standings`;

    const { data } = await firstValueFrom(
      this.httpService.get(url, { headers: { 'X-Auth-Token': apiKey } }),
    );

    // Шукаємо масив з таблицею (зазвичай це перший елемент типу TOTAL)
    const table = data.standings?.[0]?.table;
    if (!table) return;

    for (const row of table) {
      // Робимо Upsert: якщо команда є — оновлюємо статистику, якщо немає — створюємо
      await this.prisma.standing.upsert({
        where: {
          tournamentId_apiTeamId: {
            tournamentId: tournamentId,
            apiTeamId: row.team.id,
          },
        },
        update: {
          position: row.position,
          teamName: row.team.name,
          teamCrest: row.team.crest,
          playedGames: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
        create: {
          tournamentId: tournamentId,
          apiTeamId: row.team.id,
          position: row.position,
          teamName: row.team.name,
          teamCrest: row.team.crest,
          playedGames: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
      });
    }
    this.logger.log(`📊 Таблиця для ${apiCode} оновлена.`);
  }

  // МЕТОД ДЛЯ СИНХРОНІЗАЦІЇ ТОП БОМБАРДИРІВ
  private async syncTopScorers(tournamentId: string, apiCode: string) {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_TOKEN');
    const url = `https://api.football-data.org/v4/competitions/${apiCode}/scorers`;

    const { data } = await firstValueFrom(
      this.httpService.get(url, { headers: { 'X-Auth-Token': apiKey } }),
    );

    const scorers = data.scorers;
    if (!scorers || scorers.length === 0) return;

    // Стратегія "Очистив та Записав" для ТОП-10
    await this.prisma.topScorer.deleteMany({ where: { tournamentId } });

    const scorersData = scorers.map((s: any) => ({
      tournamentId: tournamentId,
      apiPlayerId: s.player.id,
      playerName: s.player.name,
      teamName: s.team.name,
      teamCrest: s.team.crest,
      goals: s.goals,
      assists: s.assists || 0,
      penalties: s.penalties || 0,
    }));

    await this.prisma.topScorer.createMany({
      data: scorersData,
    });

    this.logger.log(`⚽ Бомбардири для ${apiCode} оновлені.`);
  }
}
