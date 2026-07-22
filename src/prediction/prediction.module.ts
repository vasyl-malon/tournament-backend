import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';
import { LeaderboardModule } from 'src/leaderboard/leaderboard.module';

@Module({
  controllers: [PredictionController],
  providers: [PredictionService],
  imports: [LeaderboardModule]
})
export class PredictionModule {}
