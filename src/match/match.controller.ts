import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchStatus } from '@prisma/client';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  async getAllMatches(
    @GetUser('id') userId: string,
    @Query('status') status: MatchStatus,
    @Query('matchWeek') matchWeek: string,
    @Query('tournamentId') tournamentId: string,
    @Query('limit') limit: string,
  ) {
    return this.matchService.getAllMatches(userId, status, matchWeek, tournamentId, limit);
  }
}
