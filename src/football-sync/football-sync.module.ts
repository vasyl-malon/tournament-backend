import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FootballSyncService } from './football-sync.service';

@Module({
  imports: [HttpModule],
  providers: [FootballSyncService],
})
export class FootballSyncModule {}
