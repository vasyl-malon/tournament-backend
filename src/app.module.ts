import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './integrations/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FootballSyncModule } from './football-sync/football-sync.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TournamentModule } from './tournament/tournament.module';
import { MatchModule } from './match/match.module';
import { PredictionModule } from './prediction/prediction.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TeamModule } from './team/team.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_TOKEN'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    ScheduleModule.forRoot(),
    MailModule,
    PrismaModule,
    AuthModule,
    FootballSyncModule,
    TournamentModule,
    MatchModule,
    PredictionModule,
    LeaderboardModule,
    TeamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
