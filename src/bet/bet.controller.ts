import { Controller, Post, Get, Body, Query, UseGuards, Param } from '@nestjs/common';
import { BetService } from './bet.service';
import { CreateBetDto } from './dto/create-bet-dto';
import { JwtStrategy } from 'src/auth/auth.jwt.strategy';
import { GetUser } from 'src/decorators/get-user.decorator';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('bets')
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post('/:id')
  @UseGuards(AuthGuard, JwtStrategy)
  async predictMatch(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: CreateBetDto,
  ) {
    return this.betService.placeBet(userId, id, body);
  }

  @Get('/my')
  @UseGuards(AuthGuard, JwtStrategy)
  async getMyBets(@GetUser('id') userId: string, @Query('tournamentId') tournamentId?: string) {
    return this.betService.getUserBets(userId, tournamentId);
  }

  // @Get()
  // @UseGuards(AuthGuard, JwtStrategy)
  // async getMyBets(@GetUser('id') userId: string, @Query('tournamentId') tournamentId?: string) {
  //   if (!userId) throw new Error('userId query parameter is required for testing');
  //   return this.betService.getUserBets(userId, tournamentId);
  // }
}
