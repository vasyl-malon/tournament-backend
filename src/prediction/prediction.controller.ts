import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import { PlaceBetDto } from './dto/place-bet.dto';
import { PlaceBonusPredictionsDto } from './dto/place-bonus-predictions-dto';

@Controller('predictions')
@UseGuards(AuthGuard)
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get()
  async getBets(
    @Query('userId') userId: string,
    @Query('tournamentId') tournamentId: string,
    @GetUser('id') requesterId: string,
  ) {
    return this.predictionService.getBets(userId, tournamentId, requesterId);
  }

  @Post('/:matchId')
  async predictMatch(
    @GetUser('id') userId: string,
    @Param('matchId') matchId: string,
    @Body() body: PlaceBetDto,
  ) {
    return this.predictionService.placeBet(userId, matchId, body);
  }

  @Get('bonus')
  async getBonusPrediction(
    @GetUser('id') userId: string,
    @Query('tournamentId') tournamentId: string,
  ) {
    return this.predictionService.getUserBonusPrediction(userId, tournamentId);
  }

  @Post('bonus')
  async predictBonus(@GetUser('id') userId: string, @Body() body: PlaceBonusPredictionsDto) {
    return this.predictionService.placeBonusPrediction(userId, body);
  }
}
