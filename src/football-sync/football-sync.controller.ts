import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { FootballSyncService } from '../football-sync/football-sync.service';
import { AuthGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';

@Controller('tournaments')
@UseGuards(AuthGuard)
export class FootballSyncController {
  constructor(private readonly footballSyncService: FootballSyncService) {}

  @Post('/:id/teams/sync')
  @Roles(UserRole.ADMIN)
  async syncTournamentTeams(@Param('id') tournamentId: string) {
    return this.footballSyncService.manualSyncTeams(tournamentId);
  }

  @Post('/:id/matches/sync')
  @Roles(UserRole.ADMIN)
  async syncTournamentMatches(@Param('id') tournamentId: string) {
    return this.footballSyncService.manualSyncMatches(tournamentId);
  }
}
