import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament-dto';
import { AddParticipantDto } from './dto/add-participant-dto';

@Injectable()
export class TournamentService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkAdminRole(adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Доступ заборонено! Тільки адміністратор може виконувати цю дію.',
      );
    }
  }

  async createTournament(adminId: string, dto: CreateTournamentDto) {
    await this.checkAdminRole(adminId);

    const existing = await this.prisma.tournament.findUnique({
      where: { apiCode: dto.apiCode.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Турнір з API кодом ${dto.apiCode} вже існує.`);
    }

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        apiCode: dto.apiCode.toUpperCase(),
        status: 'UPCOMING',
      },
    });
  }

  // АДМІН: Додавання гравця в турнір
  async addParticipant(dto: AddParticipantDto) {
    const { userId, tournamentId } = dto;

    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new NotFoundException('Користувача не знайдено.');

    const tournamentExists = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournamentExists) throw new NotFoundException('Турніру не знайдено.');

    // const alreadyParticipant = await this.prisma.tournamentParticipant.findUnique({
    //   where: { userId: userId, tournamentId: tournamentId  },
    // });
    // if (alreadyParticipant) {
    //   throw new BadRequestException('Цей користувач вже бере участь у цьому турнірі.');
    // }

    return this.prisma.tournamentParticipant.create({ data: { userId, tournamentId } });
  }

  // АДМІН: Перегляд усіх турнірів зі статистикою
  async getAllTournamentsForAdmin(adminId: string) {
    await this.checkAdminRole(adminId);
    return this.prisma.tournament.findMany({
      include: {
        _count: { select: { participants: true, matches: true } },
      },
    });
  }

  // ЮЗЕР: Перегляд турнірів, у яких він бере участь
  async getTournamentsForUser(userId: string) {
    const data = await this.prisma.tournament.findMany({
      where: {
        participants: { some: { userId } },
      },
    });

    return { data };
  }
}
