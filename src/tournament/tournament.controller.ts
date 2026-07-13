import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { JwtStrategy } from 'src/auth/auth.jwt.strategy';
import { GetUser } from 'src/decorators/get-user.decorator';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  // GET /tournaments/my?userId=...
  @Get('my')
  @UseGuards(AuthGuard, JwtStrategy)
  async getMyTournaments(@GetUser('id') userId: string) {
    return this.tournamentService.getTournamentsForUser(userId);
  }
}
