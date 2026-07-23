import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import { RolesGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';
import { AddParticipantDto } from './dto/add-participant-dto';
import { CreateTournamentDto } from './dto/create-tournament-dto';

@Controller('tournaments')
@UseGuards(AuthGuard)
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get('/my')
  async getMyTournaments(@GetUser('id') userId: string) {
    return this.tournamentService.getTournamentsForUser(userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createTournament(@Body() dto: CreateTournamentDto) {
    return this.tournamentService.createTournament(dto);
  }

  @Post('/participants')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async addParticipant(@Body() dto: AddParticipantDto) {
    return this.tournamentService.addParticipant(dto);
  }

  @Get('/admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllTournamentsForAdmin() {
    return this.tournamentService.getAllTournamentsForAdmin();
  }
}