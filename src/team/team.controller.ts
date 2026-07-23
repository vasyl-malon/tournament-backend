import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetTeamsAndPlayersQueryDto } from './dto/get-teams-and-players-query.dto';

@Controller()
@UseGuards(AuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('/teams')
  async getTeams(@Query() query: GetTeamsAndPlayersQueryDto) {
    return this.teamService.getTeams(query);
  }

  @Get('/players')
  async getPlayers(@Query() query: GetTeamsAndPlayersQueryDto) {
    return this.teamService.getPlayers(query);
  }
}
