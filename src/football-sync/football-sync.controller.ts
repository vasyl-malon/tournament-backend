import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { FootballSyncService } from '../football-sync/football-sync.service';
import { AuthGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';

@Controller('football-api')
@UseGuards(AuthGuard)
export class TournamentsController {
  constructor(private readonly footballSyncService: FootballSyncService) {}

  @Post('/:id/sync')
  @Roles(UserRole.ADMIN)
  async syncTournamentData(@Param('id') tournamentId: string) {
    return this.footballSyncService.manualSyncTournament(tournamentId);
  }
}
