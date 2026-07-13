import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TournamentAdminController } from './tournament.admin.controller';

@Module({
  controllers: [TournamentController, TournamentAdminController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}