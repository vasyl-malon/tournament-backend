import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchStatus } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { JwtStrategy } from 'src/auth/auth.jwt.strategy';
import { GetUser } from 'src/decorators/get-user.decorator';
import { PlaceBetDto } from './dto/place-bet.dto';

@Controller('matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  @UseGuards(AuthGuard, JwtStrategy)
  async getAllMatches(
    @GetUser('id') userId: string,
    @Query('status') status: MatchStatus,
    @Query('matchWeek') matchWeek: string,
    @Query('tournamentId') tournamentId: string,
    @Query('limit') limit: string,
  ) {
    return this.matchService.getAllMatches(userId, status, matchWeek, tournamentId, limit);
  }

  @Get('/leaderboard')
  @UseGuards(AuthGuard, JwtStrategy)
  async getLeaderboard(@Query('tournamentId') tournamentId: string) {
    return this.matchService.getLeaderboard(tournamentId);
  }

  @Get('/bets')
  @UseGuards(AuthGuard, JwtStrategy)
  async getBets(
    @Query('userId') userId: string,
    @Query('tournamentId') tournamentId: string,
    @GetUser('id') requesterId: string,
  ) {
    return this.matchService.getBets(userId, tournamentId, requesterId);
  }

  @Post('/bets/:id')
  @UseGuards(AuthGuard, JwtStrategy)
  async predictMatch(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: PlaceBetDto,
  ) {
    return this.matchService.placeBet(userId, id, body);
  }
}
