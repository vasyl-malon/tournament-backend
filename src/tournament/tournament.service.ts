import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament-dto';
import { AddParticipantDto } from './dto/add-participant-dto';
import { TournamentErrors } from './tournament.constants';
import { randomBytes } from 'crypto';
import { MailService } from 'src/integrations/mail/mail.service';
import { InvitationStatus, TournamentStatus } from '@prisma/client';
import { FinalizeTournamentDto } from './dto/finalize-tournament-dto';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private mail: MailService,
  ) {}

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
    const tournaments = await this.prisma.tournament.findMany({
      include: {
        _count: { select: { participants: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: tournaments,
    };
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

  async inviteUser(tournamentId: string, email: string) {
    const cleanEmail = email.trim().toLowerCase();

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email address already exists.');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.upsert({
      where: {
        email_tournamentId: {
          email: cleanEmail,
          tournamentId,
        },
      },
      update: {
        token,
        expiresAt,
        status: 'PENDING',
      },
      create: {
        email: cleanEmail,
        tournamentId,
        token,
        expiresAt,
        status: 'PENDING',
      },
    });

    await this.mail.sendInvitation(email, token);

    return {
      data: {
        id: invitation.id,
        url: `https://predict-the-win.vercel.app/register?token=${token}`,
      },
    };
  }

  async getTournamentParticipantsOverview(tournamentId: string) {
    const tournamentExists = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });

    if (!tournamentExists) {
      throw new NotFoundException('Турнір не знайдено');
    }

    const [participants, pendingInvitations] = await Promise.all([
      this.prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        // orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),

      this.prisma.invitation.findMany({
        where: {
          tournamentId,
          status: InvitationStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          createdAt: true,
          expiresAt: true,
          status: true,
        },
      }),
    ]);

    return {
      data: {
        participants: participants.map((p) => ({
          id: p.user.id,
          participantId: p.id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          role: p.user.role,
          joinedAt: p.joinedAt,
        })),
        pendingInvitations,
      },
    };
  }

  async finalizeTournament(tournamentId: string, dto: FinalizeTournamentDto) {
    const tournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.FINISHED,
        championTeamId: dto.championTeamId,
        runnerUpTeamId: dto.runnerUpTeamId,
        topScorerId: dto.topScorerId,
      },
    });

    const bonusPredictions = await this.prisma.bonusPrediction.findMany({
      where: { tournamentId },
    });

    const transactionOperations: any[] = [];

    for (const prediction of bonusPredictions) {
      const championPoints =
        prediction.championTeamId === tournament.championTeamId
          ? (tournament.championTeamWorth ?? 0)
          : 0;

          console.log(prediction.championTeamId === tournament.championTeamId)

      const runnerUpPoints =
        prediction.runnerUpTeamId === tournament.runnerUpTeamId
          ? (tournament.runnerUpTeamWorth ?? 0)
          : 0;

      const topScorerPoints =
        prediction.topScorerId === tournament.topScorerId ? (tournament.topScorerWorth ?? 0) : 0;

      transactionOperations.push(
        this.prisma.bonusPrediction.update({
          where: { id: prediction.id },
          data: {
            championTeamPoints: championPoints,
            runnerUpTeamPoints: runnerUpPoints,
            topScorerPoints: topScorerPoints,
          },
        }),
      );
    }

    if (transactionOperations.length > 0) {
      await this.prisma.$transaction(transactionOperations);
    }

    return {
      success: true,
      message: `Tournament "${tournament.name}" finalized successfully. Updated ${bonusPredictions.length} bonus predictions.`,
    };
  }
}
