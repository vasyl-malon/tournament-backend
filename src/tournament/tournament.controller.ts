import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import { RolesGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';
import { AddParticipantDto } from './dto/add-participant-dto';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get('my')
  @UseGuards(AuthGuard)
  async getMyTournaments(@GetUser('id') userId: string) {
    return this.tournamentService.getTournamentsForUser(userId);
  }

  @Post('participants')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addParticipant(@Body() dto: AddParticipantDto) {
    return this.tournamentService.addParticipant(dto);
  }
}
