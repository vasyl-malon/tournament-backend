import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import {
  GetBonusPredictionsQueryDto,
  GetPredictionsQueryDto,
} from './dto/get-predictions-query.dto';
import { AddBonusPredictionDto } from './dto/add-bonus-prediction-dto';
import { AddPredictionDto } from './dto/add-prediction.dto';

@Controller('predictions')
@UseGuards(AuthGuard)
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get()
  async getPredictions(@Query() query: GetPredictionsQueryDto, @GetUser('id') requesterId: string) {
    return this.predictionService.getPredictions(query.userId, query.tournamentId, requesterId);
  }

  @Get('/bonus')
  async getBonusPredictions(
    @GetUser('id') userId: string,
    @Query() query: GetBonusPredictionsQueryDto,
  ) {
    return this.predictionService.getBonusPredictions(userId, query.tournamentId);
  }

  @Post('/bonus')
  async addBonusPrediction(@GetUser('id') userId: string, @Body() body: AddBonusPredictionDto) {
    return this.predictionService.addBonusPrediction(userId, body);
  }

  @Post('/:matchId')
  async addPrediction(
    @GetUser('id') userId: string,
    @Param('matchId') matchId: string,
    @Body() body: AddPredictionDto,
  ) {
    return this.predictionService.addPrediction(userId, matchId, body);
  }
}
