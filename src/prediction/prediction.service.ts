import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus, TournamentStatus } from '@prisma/client';
import { PredictionErrors } from './prediction.constants';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { AddPredictionDto } from './dto/add-prediction.dto';
import { AddBonusPredictionDto } from './dto/add-bonus-prediction-dto';

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async getPredictions(userId: string, tournamentId: string, requesterId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(PredictionErrors.TOURNAMENT_NOT_FOUND);
    }

    const leaderboard = await this.leaderboardService.getRankedLeaderboard(tournamentId);
    const userStats = leaderboard?.data.find((player) => player.userId === userId);

    if (!userStats) {
      throw new NotFoundException(PredictionErrors.USER_NOT_FOUND);
    }

    const isMyBets = requesterId === userId;

    const [bets, bonusPrediction] = await Promise.all([
      this.prisma.bet.findMany({
        where: {
          userId,
          match: {
            tournamentId,
            ...(!isMyBets && { status: MatchStatus.FINISHED }),
          },
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
      this.getBonusPredictions(userId, tournamentId),
    ]);

    let safeBonusPrediction = bonusPrediction;

    const shouldHideBonusPrediction =
      !isMyBets && tournament.status === TournamentStatus.UPCOMING && bonusPrediction;

    if (shouldHideBonusPrediction) {
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

  async addPrediction(userId: string, matchApiId: string, dto: AddPredictionDto) {
    const { homeScore, awayScore, predictedAdvancingTeamId } = dto;

    const match = await this.prisma.match.findUnique({
      where: { apiMatchId: matchApiId },
    });

    if (!match) {
      throw new NotFoundException(PredictionErrors.MATCH_NOT_FOUND);
    }

    if (match.status !== MatchStatus.SCHEDULED || new Date() >= match.startTime) {
      throw new BadRequestException(PredictionErrors.BETTING_CLOSED);
    }

    if (
      predictedAdvancingTeamId &&
      predictedAdvancingTeamId !== match.homeTeamId &&
      predictedAdvancingTeamId !== match.awayTeamId
    ) {
      throw new BadRequestException(PredictionErrors.INVALID_ADVANCING_TEAM);
    }

    return this.prisma.bet.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId: match.id,
        },
      },
      create: {
        userId,
        matchId: match.id,
        homeScore,
        awayScore,
        predictedAdvancingTeamId,
      },
      update: {
        homeScore,
        awayScore,
        predictedAdvancingTeamId,
      },
    });
  }

  public async getBonusPredictions(userId: string, tournamentId: string) {
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
          select: { id: true, name: true, logo: true },
        },
        runnerUpTeam: {
          select: { id: true, name: true, logo: true },
        },
        topScorer: {
          select: {
            id: true,
            name: true,
            team: { select: { name: true, logo: true } },
          },
        },
      },
    });

    if (!prediction) return null;

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
            teamName: prediction.topScorer.team?.name ?? null,
            teamLogo: prediction.topScorer.team?.logo ?? null,
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

  async addBonusPrediction(userId: string, dto: AddBonusPredictionDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: dto.tournamentId },
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
        ...(dto.championTeamId !== undefined && { championTeamId: dto.championTeamId }),
        ...(dto.runnerUpTeamId !== undefined && { runnerUpTeamId: dto.runnerUpTeamId }),
        ...(dto.topScorerId !== undefined && { topScorerId: dto.topScorerId }),
      },
    });
  }
}
