import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { MatchStatus } from '@prisma/client';
import { GetTeamsResponse } from './types';

const BASE_URL = 'https://api.football-data.org/v4';

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(FootballSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async callExternalFootballApi<T>(url: string) {
    const { data } = await firstValueFrom(
      this.httpService.get<T>(`${BASE_URL}${url}`, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN ?? '',
        },
      }),
    );

    return data;
  }

  private calculatePoints(
    predHome: number,
    predAway: number,
    actualHome: number,
    actualAway: number,
  ): number {
    const predDiff = predHome - predAway;
    const actualDiff = actualHome - actualAway;
    if (predHome === actualHome && predAway === actualAway) return 3;
    if (predDiff === actualDiff) return 2;
    if (Math.sign(predDiff) === Math.sign(actualDiff)) return 1;

    return 0;
  }

  // @Cron(CronExpression.EVERY_MINUTE)
  // async handleDailySync() {
  //   this.logger.log('🚀 Початок щоденної синхронізації ліг та бомбардирів...');

  //   // Отримуємо список усіх турнірів, які активовані у нашій базі даних
  //   const tournaments = await this.prisma.tournament.findMany();

  //   for (const tournament of tournaments) {
  //     try {
  //       this.logger.log(`🔄 Синхронізація для турніру: ${tournament.name} (${tournament.apiCode})`);

  //       // 1. Оновлюємо турнірну таблицю
  //       await this.syncStandings(tournament.id, tournament.apiCode);

  //       // 2. Оновлюємо топ-бомбардирів
  //       await this.syncTopScorers(tournament.id, tournament.apiCode);
  //     } catch (error) {
  //       this.logger.error(`❌ Помилка синхронізації турніру ${tournament.apiCode}:`, error.message);
  //     }
  //   }

  //   this.logger.log('✅ Щоденну синхронізацію успішно завершено!');
  // }

  // МЕТОД ДЛЯ СИНХРОНІЗАЦІЇ ТУРНІРНОЇ ТАБЛИЦІ
  private async syncStandings(tournamentId: string, apiCode: string) {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_TOKEN');
    const url = `https://api.football-data.org/v4/competitions/${apiCode}/standings`;

    const { data } = await firstValueFrom(
      this.httpService.get(url, { headers: { 'X-Auth-Token': apiKey } }),
    );

    // Шукаємо масив з таблицею (зазвичай це перший елемент типу TOTAL)
    const table = data.standings?.[0]?.table;
    if (!table) return;

    for (const row of table) {
      // Робимо Upsert: якщо команда є — оновлюємо статистику, якщо немає — створюємо
      await this.prisma.standing.upsert({
        where: {
          tournamentId_apiTeamId: {
            tournamentId: tournamentId,
            apiTeamId: row.team.id,
          },
        },
        update: {
          position: row.position,
          teamName: row.team.name,
          teamCrest: row.team.crest,
          playedGames: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
        create: {
          tournamentId: tournamentId,
          apiTeamId: row.team.id,
          position: row.position,
          teamName: row.team.name,
          teamCrest: row.team.crest,
          playedGames: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
      });
    }
    this.logger.log(`📊 Таблиця для ${apiCode} оновлена.`);
  }

  // МЕТОД ДЛЯ СИНХРОНІЗАЦІЇ ТОП БОМБАРДИРІВ
  private async syncTopScorers(tournamentId: string, apiCode: string) {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_TOKEN');
    const url = `https://api.football-data.org/v4/competitions/${apiCode}/scorers`;

    const { data } = await firstValueFrom(
      this.httpService.get(url, { headers: { 'X-Auth-Token': apiKey } }),
    );
    console.log('data: ', data);

    const scorers = data.scorers;
    if (!scorers || scorers.length === 0) return;

    // Стратегія "Очистив та Записав" для ТОП-10
    await this.prisma.topScorer.deleteMany({ where: { tournamentId } });

    const scorersData = scorers.map((s: any) => ({
      tournamentId: tournamentId,
      apiPlayerId: s.player.id,
      playerName: s.player.name,
      teamName: s.team.name,
      teamCrest: s.team.crest,
      goals: s.goals,
      assists: s.assists || 0,
      penalties: s.penalties || 0,
    }));

    await this.prisma.topScorer.createMany({
      data: scorersData,
    });

    this.logger.log(`⚽ Бомбардири для ${apiCode} оновлені.`);
  }

  @Cron('0 3 * * *')
  async syncTeamsAndPlayers() {
    this.logger.log('🚀 Starting teams and players synchronization...');

    const tournaments = await this.prisma.tournament.findMany({
      where: { status: 'UPCOMING' },
    });

    for (const tournament of tournaments) {
      try {
        this.logger.log(`Fetching teams for tournament: ${tournament.name}`);

        const data = await this.callExternalFootballApi<GetTeamsResponse>(
          `/competitions/${tournament.apiCode}/teams`,
        );

        for (let i = 0; i < data.teams.length; i++) {
          const team = data.teams[i];

          await this.prisma.team.upsert({
            where: { id: team.id },
            update: {
              name: team.shortName,
              code: team.tla,
              logo: team.crest,
            },
            create: {
              id: team.id,
              name: team.shortName,
              code: team.tla,
              logo: team.crest,
            },
          });

          await this.prisma.tournamentTeam.upsert({
            where: {
              tournamentId_teamId: {
                tournamentId: tournament.id,
                teamId: team.id,
              },
            },
            update: {},
            create: {
              tournamentId: tournament.id,
              teamId: team.id,
            },
          });

          for (const player of team.squad ?? []) {
            await this.prisma.player.upsert({
              where: {
                id: player.id,
              },
              update: {
                name: player.name,
                position: player.position ?? 'Unknown',
                dateOfBirth: player.dateOfBirth,
                nationality: player.nationality,
                teamId: team.id,
              },
              create: {
                id: player.id,
                name: player.name,
                position: player.position ?? 'Unknown',
                dateOfBirth: player.dateOfBirth,
                nationality: player.nationality,
                teamId: team.id,
              },
            });
          }

          this.logger.log(`Synced ${team.squad?.length ?? 0} players for ${team.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to sync tournament ${tournament.name}`, error);
      }
    }
  }

  // @Cron('*/15 * * * *')
  async handleMatchSync() {
    this.logger.log('⚽ Початок синхронізації розкладу та результатів матчів...');

    const tournaments = await this.prisma.tournament.findMany({
      where: { status: 'ONGOING' }, // Порада: якщо турнір уже йде, можливо статус варто змінити на 'ACTIVE'
    });
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_TOKEN');

    for (const tournament of tournaments) {
      try {
        this.logger.log(`⏳ Завантаження матчів для: ${tournament.name} (${tournament.apiCode})`);

        const url = `https://api.football-data.org/v4/competitions/${tournament.apiCode}/matches`;
        const { data } = await firstValueFrom(
          this.httpService.get(url, { headers: { 'X-Auth-Token': apiKey } }),
        );

        const matches = data.matches;
        if (!matches || matches.length === 0) continue;

        for (const m of matches) {
          const mappedStatus = this.mapMatchStatus(m.status);
          const apiMatchId = String(m.id);
          const homeScore = m.score?.fullTime?.home ?? null;
          const awayScore = m.score?.fullTime?.away ?? null;

          // 1. Спочатку шукаємо матч в БД разом із ставками користувачів
          const dbMatch = await this.prisma.match.findUnique({
            where: { apiMatchId },
            include: { bets: true },
          });

          if (!dbMatch) {
            // КЕЙС 1: Матчу взагалі немає в базі -> Створюємо його
            await this.prisma.match.create({
              data: {
                apiMatchId,
                tournamentId: tournament.id,
                homeTeam: m.homeTeam.shortName,
                awayTeam: m.awayTeam.shortName,
                homeTeamLogo: m.homeTeam.crest,
                awayTeamLogo: m.awayTeam.crest,
                startTime: new Date(m.utcDate),
                status: mappedStatus,
                homeScore,
                awayScore,
                stage: m.stage,
                group: m.group ?? null,
                matchday: m.matchday ?? null,
              },
            });
          } else {
            // КЕЙС 2: Матч вже є в базі. Перевіряємо, чи він ШОЙНО ЗАВЕРШИВСЯ
            if (mappedStatus === 'FINISHED' && dbMatch.status !== 'FINISHED') {
              this.logger.log(
                `🎯 Матч ${dbMatch.homeTeam} - ${dbMatch.awayTeam} завершився (${homeScore}:${awayScore}). Розраховуємо бали...`,
              );

              const transactionOperations: any[] = [];

              // Операція А: Оновлюємо сам матч результатами
              transactionOperations.push(
                this.prisma.match.update({
                  where: { apiMatchId },
                  data: {
                    status: mappedStatus,
                    homeScore,
                    awayScore,
                    startTime: new Date(m.utcDate),
                  },
                }),
              );

              // Операція Б: Рахуємо бали для кожної ставки на цей матч
              for (const bet of dbMatch.bets) {
                // Якщо рахунок з API прилетів null (що навряд чи для FINISHED), страхуємося нулями
                const points = this.calculatePoints(
                  bet.homeScore,
                  bet.awayScore,
                  homeScore ?? 0,
                  awayScore ?? 0,
                );

                transactionOperations.push(
                  this.prisma.bet.update({
                    where: { id: bet.id },
                    data: { pointsEarned: points },
                  }),
                );
              }

              // Виконуємо все атомарно в транзакції
              await this.prisma.$transaction(transactionOperations);
              this.logger.log(`✅ Бали для матчу ID ${apiMatchId} успішно розподілено.`);
            } else {
              // КЕЙС 3: Звичайне оновлення (матч ще не почався, йде в лайві, або вже давно завершений)
              // Просто оновлюємо поточний рахунок/статус/час, ставки не чіпаємо
              await this.prisma.match.update({
                where: { apiMatchId },
                data: {
                  status: mappedStatus,
                  homeScore,
                  awayScore,
                  startTime: new Date(m.utcDate),
                },
              });
            }
          }
        }

        this.logger.log(`✅ Матчі для ${tournament.apiCode} успішно оброблено.`);
      } catch (error) {
        this.logger.error(`❌ Не вдалося оновити матчі для ${tournament.apiCode}:`, error.message);
      }
    }
  }

  // ДОПОМІЖНИЙ МЕТОД ДЛЯ КОНВЕРТАЦІЇ СТАТУСІВ
  // Зовнішнє API має багато статусів (TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED тощо)
  // Ми зводимо їх до наших трьох: SCHEDULED, LIVE, FINISHED
  private mapMatchStatus(apiStatus: string): MatchStatus {
    switch (apiStatus) {
      case 'IN_PLAY':
      case 'PAUSED':
        return MatchStatus.LIVE;
      case 'FINISHED':
      case 'AWARDED':
        return MatchStatus.FINISHED;
      case 'SCHEDULED':
      case 'TIMED':
      case 'POSTPONED':
      case 'SUSPENDED':
      default:
        return MatchStatus.SCHEDULED;
    }
  }
}
