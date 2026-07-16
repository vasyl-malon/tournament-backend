import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';
import { PlaceBetDto } from './dto/place-bet.dto';

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
      },
    });

    const leaderboardWithoutRanks = participants.map((player) => {
      const stats = this.calculateUserStats(player.bets);
      return {
        userId: player.id,
        email: player.email,
        firstName: player.firstName,
        lastName: player.lastName,
        ...stats,
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

    const bets = await this.prisma.bet.findMany({
      where: {
        userId,
        match: { tournamentId, ...(!isMyBets && { status: MatchStatus.FINISHED }) },
      },
      include: { match: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: {
        stats: userStats,
        bets,
      },
    };
  }

  async placeBet(userId: string, id: string, dto: PlaceBetDto) {
    const { homeScore, awayScore } = dto;

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

    const existingBet = await this.prisma.bet.findFirst({
      where: { userId, matchId: id },
    });

    if (existingBet) {
      return this.prisma.bet.update({
        where: { id: existingBet.id },
        data: { homeScore, awayScore },
      });
    }

    return this.prisma.bet.create({
      data: {
        userId,
        matchId: id,
        homeScore,
        awayScore,
      },
    });
  }

  async placeBet2(tournamentId: string) {

const relations = await this.prisma.tournamentTeam.findMany();

  console.log('tournamentId:', tournamentId);


console.log(relations);

    const teams = await this.prisma.team.findMany({
      where: {
        tournaments: {
          some: {
            tournamentId,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return teams;
  }
}
