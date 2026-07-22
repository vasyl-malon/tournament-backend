import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('/team')
  async getTeams(@Query('tournamentId') tournamentId: string, @Query('search') search: string) {
    return this.teamService.getTeams(tournamentId, search);
  }

  @Get('/players')
  @UseGuards(AuthGuard)
  async getPlayers(@Query('tournamentId') tournamentId: string, @Query('search') search: string) {
    return this.teamService.getPlayers(tournamentId, search);
  }
}
