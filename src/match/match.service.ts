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
}
