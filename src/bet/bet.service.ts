import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBetDto } from './dto/create-bet-dto';

@Injectable()
export class BetService {
  constructor(private readonly prisma: PrismaService) {}

  async placeBet(userId: string, id: string, dto: CreateBetDto) {
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

  async getUserBets(userId: string, tournamentId?: string) {
    return this.prisma.bet.findMany({
      where: {
        userId,
        ...(tournamentId && { match: { tournamentId } }),
      },
      include: {
        match: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
