import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetLeaderboardQueryDto } from './dto/get-leaderboard.dto';

@Controller('leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query() query: GetLeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(query.tournamentId);
  }
}
