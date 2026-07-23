import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament-dto';
import { AddParticipantDto } from './dto/add-participant-dto';
import { TournamentErrors } from './tournament.constants';

@Injectable()
export class TournamentService {
  constructor(private readonly prisma: PrismaService) {}

  async createTournament(dto: CreateTournamentDto) {
    const apiCodeUpper = dto.apiCode.toUpperCase();

    const existing = await this.prisma.tournament.findUnique({
      where: { apiCode: apiCodeUpper },
    });

    if (existing) {
      throw new BadRequestException(TournamentErrors.TOURNAMENT_ALREADY_EXISTS);
    }

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        apiCode: apiCodeUpper,
        status: 'UPCOMING',
      },
    });
  }

  async addParticipant(dto: AddParticipantDto) {
    const { userId, tournamentId } = dto;

    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException(TournamentErrors.USER_NOT_FOUND);
    }

    const tournamentExists = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournamentExists) {
      throw new NotFoundException(TournamentErrors.TOURNAMENT_NOT_FOUND);
    }

    const alreadyParticipant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: { tournamentId, userId },
      },
    });

    if (alreadyParticipant) {
      throw new BadRequestException(TournamentErrors.ALREADY_PARTICIPANT);
    }

    return this.prisma.tournamentParticipant.create({
      data: { userId, tournamentId },
    });
  }

  async getAllTournamentsForAdmin() {
    return this.prisma.tournament.findMany({
      include: {
        _count: { select: { participants: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTournamentsForUser(userId: string) {
    const data = await this.prisma.tournament.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data };
  }
}
