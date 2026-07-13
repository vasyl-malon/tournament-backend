import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament-dto';
import { AddParticipantDto } from './dto/add-participant-dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/role-admin.guard';

@Controller('admin/tournaments')
export class TournamentAdminController {
  constructor(private readonly tournamentService: TournamentService) {}

  // POST /admin/tournaments?adminId=...
  @Post()
  async createTournament(@Query('adminId') adminId: string, @Body() dto: CreateTournamentDto) {
    return this.tournamentService.createTournament(adminId, dto);
  }

  // POST /admin/tournaments/participants?adminId=...
  @Post('participants')
  @UseGuards(AuthGuard, AdminGuard)
  async addParticipant(@Body() dto: AddParticipantDto) {
    return this.tournamentService.addParticipant(dto);
  }

  // GET /admin/tournaments?adminId=...
  @Get()
  async getAllForAdmin(@Query('adminId') adminId: string) {
    return this.tournamentService.getAllTournamentsForAdmin(adminId);
  }
}