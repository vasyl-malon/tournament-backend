import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetTeamsAndPlayersQueryDto } from './dto/get-teams-and-players-query.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeams(query: GetTeamsAndPlayersQueryDto) {
    const { tournamentId, search } = query;
    const cleanSearch = search?.trim();

    const teams = await this.prisma.team.findMany({
      where: {
        tournaments: {
          some: { tournamentId },
        },
        ...(cleanSearch && {
          name: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        }),
      },
      select: {
        id: true,
        name: true,
        logo: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return { data: teams };
  }

  async getPlayers(query: GetTeamsAndPlayersQueryDto) {
    const { tournamentId, search } = query;
    const cleanSearch = search?.trim();

    const players = await this.prisma.player.findMany({
      where: {
        team: {
          tournaments: {
            some: { tournamentId },
          },
        },
        ...(cleanSearch && {
          name: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        }),
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
      orderBy: { name: 'asc' },
    });

    return { data: players };
  }
}
