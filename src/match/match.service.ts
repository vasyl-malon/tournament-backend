import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus, TournamentStatus } from '@prisma/client';
import { PlaceBetDto } from './dto/place-bet.dto';
import { PlaceBonusPredictionsDto } from './dto/place-bonus-predictions-dto';

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

  public calculateUserStats(bets: { pointsEarned: number }[]) {
    let totalPoints = 0;
    let exactCount = 0;
    let differenceCount = 0;
    let outcomeCount = 0;

    bets.forEach((bet) => {
      totalPoints += bet.pointsEarned;

      if (bet.pointsEarned === 3) {
        exactCount++;
      } else if (bet.pointsEarned === 2) {
        differenceCount++;
      } else if (bet.pointsEarned === 1) {
        outcomeCount++;
      }
    });

    return {
      totalPoints,
      exactCount,
      differenceCount,
      outcomeCount,
      totalPredictions: bets.length,
    };
  }

  public async getRankedLeaderboard(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { status: true },
    });

    const isTournamentFinished = tournament?.status === 'FINISHED';

    const participants = await this.prisma.user.findMany({
      where: {
        tournaments: {
          some: { tournamentId },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bets: {
          where: {
            match: { tournamentId },
          },
          select: {
            pointsEarned: true,
          },
        },
        bonusPredictions: {
          where: { tournamentId },
          select: {
            championTeamPoints: true,
            runnerUpTeamPoints: true,
            topScorerPoints: true,
          },
        },
      },
    });

    const leaderboardWithoutRanks = participants.map((player) => {
      const stats = this.calculateUserStats(player.bets);

      let bonusPoints = 0;

      if (isTournamentFinished && player.bonusPredictions?.[0]) {
        const bonus = player.bonusPredictions[0];
        bonusPoints += bonus.championTeamPoints ?? 0;
        bonusPoints += bonus.runnerUpTeamPoints ?? 0;
        bonusPoints += bonus.topScorerPoints ?? 0;
      }

      return {
        userId: player.id,
        email: player.email,
        firstName: player.firstName,
        lastName: player.lastName,
        ...stats,
        totalPoints: stats.totalPoints + bonusPoints,
        bonusPoints,
      };
    });

    const sortedLeaderboard = leaderboardWithoutRanks.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return b.differenceCount - a.differenceCount;
    });

    let currentRank = 1;
    return sortedLeaderboard.map((player, index) => {
      if (index > 0) {
        const prevPlayer = sortedLeaderboard[index - 1];

        const isTie =
          player.totalPoints === prevPlayer.totalPoints &&
          player.exactCount === prevPlayer.exactCount &&
          player.differenceCount === prevPlayer.differenceCount;

        if (!isTie) {
          currentRank = index + 1;
        }
      }

      return {
        rank: currentRank,
        ...player,
      };
    });
  }

  async getAllMatches(
    userId: string,
    status: MatchStatus,
    matchWeek: string,
    tournamentId: string,
    limit: string,
  ) {
    const filters = {
      tournamentId,
      ...(matchWeek && {
        matchday: parseInt(matchWeek),
      }),
      ...(status && { status }),
    };

    if (!tournamentId) return { data: [] };

    const takeLimit = limit ? parseInt(limit, 10) : undefined;

    const matches = await this.prisma.match.findMany({
      where: filters,
      orderBy: { startTime: 'asc' },
      take: takeLimit,
      include: {
        awayTeam: {},
        homeTeam: {},
        bets: {
          where: { userId },
        },
      },
    });

    return {
      data: matches,
    };
  }

  async getLeaderboard(tournamentId: string) {
    const leaderboard = await this.getRankedLeaderboard(tournamentId);
    return {
      data: leaderboard,
    };
  }

  async getBets(userId: string, tournamentId: string, requesterId: string) {
    const leaderboard = await this.getRankedLeaderboard(tournamentId);

    const userStats = leaderboard.find((player) => player.userId === userId);

    if (!userStats) {
      throw new NotFoundException('User not found in this tournament');
    }

    const isMyBets = requesterId === userId;

    // 1. Одночасно отримуємо ставки та бонусний прогноз
    const [bets, bonusPrediction] = await Promise.all([
      this.prisma.bet.findMany({
        where: {
          userId,
          match: { tournamentId, ...(!isMyBets && { status: MatchStatus.FINISHED }) },
        },
        include: { match: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.getUserBonusPrediction(tournamentId, userId), // наш новий метод
    ]);

    // 2. Якщо це чужі ставки, а турнір НЕ завершився — приховуємо вибір команд/гравців,
    // щоб користувачі не могли списувати прогнози один в одного до кінця турніру.
    const isTournamentFinished = leaderboard[0]?.bonusPoints !== undefined; // або будь-яка інша перевірка на FINISHED

    let safeBonusPrediction = bonusPrediction;
    if (!isMyBets && !isTournamentFinished && bonusPrediction) {
      safeBonusPrediction = {
        ...bonusPrediction,
        champion: null,
        runnerUp: null,
        topScorer: null,
        // залишаємо дати або ID, але приховуємо сам вибір
      };
    }

    return {
      data: {
        stats: userStats,
        bets,
        bonusPrediction: safeBonusPrediction, // Додаємо у відповідь
      },
    };
  }

  async placeBet(userId: string, id: string, dto: PlaceBetDto) {
    const { homeScore, awayScore, predictedAdvancingTeamId } = dto;

    const match = await this.prisma.match.findUnique({
      where: { apiMatchId: id },
    });

    if (!match) {
      throw new NotFoundException('NOT_FOUND');
    }

    const currentTime = new Date();
    if (match.status !== 'SCHEDULED' || currentTime >= new Date(match.startTime)) {
      throw new BadRequestException('FORBIDDEN');
    }

    if (
      predictedAdvancingTeamId &&
      predictedAdvancingTeamId !== match.homeTeamId &&
      predictedAdvancingTeamId !== match.awayTeamId
    ) {
      throw new BadRequestException('INVALID_ADVANCING_TEAM');
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

  async getTeams(tournamentId: string, search: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        tournaments: {
          some: {
            tournamentId,
          },
        },
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        logo: true,
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
    });

    return { data: teams };
  }

  async getPlayers(tournamentId: string, search: string) {
    const players = await this.prisma.player.findMany({
      where: {
        team: {
          tournaments: {
            some: {
              tournamentId,
            },
          },
        },
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        position: true,
        team: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
    });

    return { data: players };
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
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException('Predictions are closed for this tournament');
    }

    const teamIds = tournament.teams.map((team) => Number(team.teamId));
    const playerIds = tournament.players.map((player) => Number(player.playerId));

    if (dto.championTeamId !== undefined && !teamIds.includes(dto.championTeamId)) {
      throw new BadRequestException('Champion team is not in tournament');
    }

    if (dto.runnerUpTeamId !== undefined && !teamIds.includes(dto.runnerUpTeamId)) {
      throw new BadRequestException('Runner-up team is not in tournament');
    }

    if (dto.topScorerId !== undefined && !playerIds.includes(dto.topScorerId)) {
      throw new BadRequestException('Player is not in tournament');
    }

    if (
      dto.championTeamId !== undefined &&
      dto.runnerUpTeamId !== undefined &&
      dto.championTeamId === dto.runnerUpTeamId
    ) {
      throw new BadRequestException('Champion and runner-up must be different teams');
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
}
