import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FootballSyncService } from './football-sync.service';
import { FootballSyncController } from './football-sync.controller';

@Module({
  imports: [HttpModule],
  controllers: [FootballSyncController],
  providers: [FootballSyncService],
})
export class FootballSyncModule {}
