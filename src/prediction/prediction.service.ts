import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus, TournamentStatus } from '@prisma/client';
import { PlaceBetDto } from './dto/place-bet.dto';
import { PlaceBonusPredictionsDto } from './dto/place-bonus-predictions-dto';
import { PredictionErrors } from './prediction.constants';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async getBets(userId: string, tournamentId: string, requesterId: string) {
    const leaderboard = await this.leaderboardService.getRankedLeaderboard(tournamentId);

    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
    });

    if (!tournament) {
      throw new NotFoundException(PredictionErrors.TOURNAMENT_NOT_FOUND);
    }

    const userStats = leaderboard.find((player) => player.userId === userId);

    if (!userStats) {
      throw new NotFoundException(PredictionErrors.USER_NOT_FOUND);
    }

    const isMyBets = requesterId === userId;

    const [bets, bonusPrediction] = await Promise.all([
      this.prisma.bet.findMany({
        where: {
          userId,
          match: { tournamentId, ...(!isMyBets && { status: MatchStatus.FINISHED }) },
        },
        include: {
          match: {
            include: {
              awayTeam: true,
              homeTeam: true,
              advancingTeam: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.getUserBonusPrediction(tournamentId, userId),
    ]);

    let safeBonusPrediction = bonusPrediction;
    const isSaveShowBonusPrediction =
      !isMyBets && tournament?.status === TournamentStatus.UPCOMING && bonusPrediction;

    if (isSaveShowBonusPrediction) {
      safeBonusPrediction = {
        ...bonusPrediction,
        champion: null,
        runnerUp: null,
        topScorer: null,
      };
    }

    return {
      data: {
        stats: userStats,
        bets,
        bonusPrediction: safeBonusPrediction,
      },
    };
  }

  async placeBet(userId: string, id: string, dto: PlaceBetDto) {
    const { homeScore, awayScore, predictedAdvancingTeamId } = dto;

    const match = await this.prisma.match.findUnique({
      where: { apiMatchId: id },
    });

    if (!match) {
      throw new NotFoundException(PredictionErrors.MATCH_NOT_FOUND);
    }

    const currentTime = new Date();
    if (match.status !== MatchStatus.SCHEDULED || currentTime >= new Date(match.startTime)) {
      throw new BadRequestException(PredictionErrors.BETTING_CLOSED);
    }

    if (
      predictedAdvancingTeamId &&
      predictedAdvancingTeamId !== match.homeTeamId &&
      predictedAdvancingTeamId !== match.awayTeamId
    ) {
      throw new BadRequestException(PredictionErrors.INVALID_ADVANCING_TEAM);
    }

    const existingBet = await this.prisma.bet.findFirst({
      where: { userId, matchId: id },
    });

    if (existingBet) {
      return this.prisma.bet.update({
        where: { id: existingBet.id },
        data: {
          homeScore,
          awayScore,
          predictedAdvancingTeamId,
        },
      });
    }

    return this.prisma.bet.create({
      data: {
        userId,
        matchId: id,
        homeScore,
        awayScore,
        predictedAdvancingTeamId,
      },
    });
  }

  public async getUserBonusPrediction(tournamentId: string, userId: string) {
    const prediction = await this.prisma.bonusPrediction.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId,
        },
      },
      include: {
        tournament: {
          select: {
            status: true,
            championTeamWorth: true,
            runnerUpTeamWorth: true,
            topScorerWorth: true,
          },
        },
        championTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        runnerUpTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        topScorer: {
          select: {
            id: true,
            name: true,
            team: {
              select: {
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!prediction) {
      return null;
    }

    return {
      id: prediction.id,
      userId: prediction.userId,
      tournamentId: prediction.tournamentId,
      tournamentStatus: prediction.tournament.status,
      createdAt: prediction.createdAt,
      updatedAt: prediction.updatedAt,
      champion: prediction.championTeam
        ? {
            id: prediction.championTeam.id,
            name: prediction.championTeam.name,
            logo: prediction.championTeam.logo,
            pointsWorth: prediction.tournament.championTeamWorth,
            pointsEarned: prediction.championTeamPoints,
          }
        : null,
      runnerUp: prediction.runnerUpTeam
        ? {
            id: prediction.runnerUpTeam.id,
            name: prediction.runnerUpTeam.name,
            logo: prediction.runnerUpTeam.logo,
            pointsWorth: prediction.tournament.runnerUpTeamWorth,
            pointsEarned: prediction.runnerUpTeamPoints,
          }
        : null,
      topScorer: prediction.topScorer
        ? {
            id: prediction.topScorer.id,
            name: prediction.topScorer.name,
            teamName: prediction.topScorer.team?.name || null,
            teamLogo: prediction.topScorer.team?.logo || null,
            pointsWorth: prediction.tournament.topScorerWorth,
            pointsEarned: prediction.topScorerPoints,
          }
        : null,
      totalBonusPoints:
        (prediction.championTeamPoints ?? 0) +
        (prediction.runnerUpTeamPoints ?? 0) +
        (prediction.topScorerPoints ?? 0),
    };
  }

  async placeBonusPrediction(userId: string, dto: PlaceBonusPredictionsDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: {
        id: dto.tournamentId,
      },
      include: {
        teams: true,
        players: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(PredictionErrors.TOURNAMENT_NOT_FOUND);
    }

    if (tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException(PredictionErrors.BONUS_PREDICTIONS_CLOSED);
    }

    const teamIds = tournament.teams.map((team) => Number(team.teamId));
    const playerIds = tournament.players.map((player) => Number(player.playerId));

    if (dto.championTeamId !== undefined && !teamIds.includes(dto.championTeamId)) {
      throw new BadRequestException(PredictionErrors.INVALID_CHAMPION_TEAM);
    }

    if (dto.runnerUpTeamId !== undefined && !teamIds.includes(dto.runnerUpTeamId)) {
      throw new BadRequestException(PredictionErrors.INVALID_RUNNER_UP_TEAM);
    }

    if (dto.topScorerId !== undefined && !playerIds.includes(dto.topScorerId)) {
      throw new BadRequestException(PredictionErrors.INVALID_TOP_SCORER);
    }

    if (
      dto.championTeamId !== undefined &&
      dto.runnerUpTeamId !== undefined &&
      dto.championTeamId === dto.runnerUpTeamId
    ) {
      throw new BadRequestException(PredictionErrors.DUPLICATE_FINALISTS);
    }

    return this.prisma.bonusPrediction.upsert({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId: dto.tournamentId,
        },
      },
      create: {
        userId,
        tournamentId: dto.tournamentId,
        championTeamId: dto.championTeamId,
        runnerUpTeamId: dto.runnerUpTeamId,
        topScorerId: dto.topScorerId,
      },
      update: {
        ...(dto.championTeamId !== undefined && {
          championTeamId: dto.championTeamId,
        }),
        ...(dto.runnerUpTeamId !== undefined && {
          runnerUpTeamId: dto.runnerUpTeamId,
        }),
        ...(dto.topScorerId !== undefined && {
          topScorerId: dto.topScorerId,
        }),
      },
    });
  }
}
