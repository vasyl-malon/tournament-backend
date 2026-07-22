import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}
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
}
