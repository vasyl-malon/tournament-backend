import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import { RolesGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';
import { AddParticipantDto } from './dto/add-participant-dto';
import { CreateTournamentDto } from './dto/create-tournament-dto';
import { InviteUserDto } from './dto/invite-user.dto';

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

  @Get('/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllTournamentsForAdmin() {
    return this.tournamentService.getAllTournamentsForAdmin();
  }

  @Post('/:id/invitations')
  async sendInvitation(@Param('id') tournamentId: string, @Body() dto: InviteUserDto) {
    return this.tournamentService.inviteUser(tournamentId, dto.email);
  }

  @Get('/:id/participants-overview')
  async getParticipantsOverview(@Param('id') tournamentId: string) {
    return this.tournamentService.getTournamentParticipantsOverview(tournamentId);
  }
}
