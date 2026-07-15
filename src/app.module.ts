import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';

import { MailModule } from './integrations/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FootballSyncModule } from './football-sync/football-sync.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TournamentModule } from './tournament/tournament.module';
import { MatchModule } from './match/match.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MailModule,
    PrismaModule,
    AuthModule,
    FootballSyncModule,
    TournamentModule,
    MatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
