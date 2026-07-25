import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveUsers(query: string, tournamentId?: string) {
    // if (!query || query.trim().length < 2) {
    //   return [];
    // }

    const cleanQuery = query.trim();

    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        ...(tournamentId && {
          tournaments: {
            none: {
              tournamentId,
            },
          },
        }),
        OR: [
          { firstName: { contains: cleanQuery, mode: 'insensitive' } },
          { lastName: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return {
      data: users,
    };
  }

  // async getTeams(query: GetTeamsAndPlayersQueryDto) {
  //   const { tournamentId, search } = query;
  //   const cleanSearch = search?.trim();

  //   const teams = await this.prisma.team.findMany({
  //     where: {
  //       tournaments: {
  //         some: { tournamentId },
  //       },
  //       ...(cleanSearch && {
  //         name: {
  //           contains: cleanSearch,
  //           mode: 'insensitive',
  //         },
  //       }),
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       logo: true,
  //     },
  //     take: 20,
  //     orderBy: { name: 'asc' },
  //   });

  //   return { data: teams };
  // }

  // async getPlayers(query: GetTeamsAndPlayersQueryDto) {
  //   const { tournamentId, search } = query;
  //   const cleanSearch = search?.trim();

  //   const players = await this.prisma.player.findMany({
  //     where: {
  //       team: {
  //         tournaments: {
  //           some: { tournamentId },
  //         },
  //       },
  //       ...(cleanSearch && {
  //         name: {
  //           contains: cleanSearch,
  //           mode: 'insensitive',
  //         },
  //       }),
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       position: true,
  //       team: {
  //         select: {
  //           name: true,
  //           logo: true,
  //         },
  //       },
  //     },
  //     take: 20,
  //     orderBy: { name: 'asc' },
  //   });

  //   return { data: players };
  // }
}
