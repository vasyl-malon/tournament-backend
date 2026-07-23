import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMatchesQueryDto } from './dto/get-matches-query.dto';

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(userId: string, query: GetMatchesQueryDto) {
    const { tournamentId, matchWeek, status, limit } = query;

    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        ...(matchWeek && { matchday: matchWeek }),
        ...(status && { status }),
      },
      orderBy: { startTime: 'asc' },
      take: limit,
      include: {
        awayTeam: true,
        homeTeam: true,
        bets: {
          where: { userId },
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            pointsEarned: true,
          },
        },
      },
    });

    const formattedMatches = matches.map(({ bets, ...match }) => ({
      ...match,
      userBet: bets[0] ?? null,
    }));

    return {
      data: formattedMatches,
    };
  }
}
