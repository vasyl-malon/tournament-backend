import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

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
      let totalPoints = 0;
      let exactCount = 0;
      let differenceCount = 0;
      let outcomeCount = 0;

      player.bets.forEach((bet) => {
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
        userId: player.id,
        email: player.email,
        firstName: player.firstName,
        lastName: player.lastName,
        totalPoints,
        exactCount,
        differenceCount,
        outcomeCount,
        totalPredictions: player.bets.length,
      };
    });

    const sortedLeaderboard = leaderboardWithoutRanks.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return b.differenceCount - a.differenceCount;
    });

    let currentRank = 1;

    const finalLeaderboard = sortedLeaderboard.map((player, index) => {
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

    return {
      data: finalLeaderboard,
    };
  }
}
