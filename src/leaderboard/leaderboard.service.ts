import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionPoints } from './leaderboard.constants';
import { TournamentStatus } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateUserStats(bets: { pointsEarned: number }[]) {
    let totalPoints = 0;
    let exactCount = 0;
    let differenceCount = 0;
    let outcomeCount = 0;

    bets.forEach((bet) => {
      totalPoints += bet.pointsEarned;

      if (bet.pointsEarned === PredictionPoints.EXACT) {
        exactCount++;
      } else if (bet.pointsEarned === PredictionPoints.GOAL_DIFFERENCE) {
        differenceCount++;
      } else if (bet.pointsEarned === PredictionPoints.OUTCOME) {
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

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
    }

    const isTournamentFinished = tournament.status === TournamentStatus.FINISHED;

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
      const bonus = player.bonusPredictions?.[0];

      if (isTournamentFinished && bonus) {
        bonusPoints =
          (bonus.championTeamPoints ?? 0) +
          (bonus.runnerUpTeamPoints ?? 0) +
          (bonus.topScorerPoints ?? 0);
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

    const sortedLeaderboard = [...leaderboardWithoutRanks].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return b.differenceCount - a.differenceCount;
    });

    let currentRank = 1;
    const rankedData = sortedLeaderboard.map((player, index) => {
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
      data: rankedData,
    };
  }

  async getLeaderboard(tournamentId: string) {
    const leaderboard = await this.getRankedLeaderboard(tournamentId);
    return {
      data: leaderboard,
    };
  }
}
