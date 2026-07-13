import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { MatchStatus } from '@prisma/client';
import { mockData } from './mock-data';



@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(FootballSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

private calculatePoints(
  predHome: number, predAway: number,
  actualHome: number, actualAway: number
): number {
  // 1. Точний результат -> 3 бали
  // (наприклад: прогноз 2:1, факт 2:1)
  if (predHome === actualHome && predAway === actualAway) {
    return 3;
  }

  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;

  // 2. Точна різниця або нічия -> 2 бали
  // (наприклад: прогноз 2:1, факт 3:2 (різниця +1) або прогноз 1:1, факт 3:3 (нічия, різниця 0))
  if (predDiff === actualDiff) {
    return 2;
  }

  // 3. Просто вгадано результат / тенденцію -> 1 бал
  // (наприклад: прогноз 2:0, факт 3:1 — обидва рази виграли господарі, але різниця й рахунок інші)
  if (Math.sign(predDiff) === Math.sign(actualDiff)) {
    return 1;
  }

  // 4. Повне мимо -> 0 балів
  return 0;
}


  // Налаштування Крону: Запуск щоночі о 03:00 ночі
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

  @Cron('*/15 * * * *')
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
              this.logger.log(`🎯 Матч ${dbMatch.homeTeam} - ${dbMatch.awayTeam} завершився (${homeScore}:${awayScore}). Розраховуємо бали...`);

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
                })
              );

              // Операція Б: Рахуємо бали для кожної ставки на цей матч
              for (const bet of dbMatch.bets) {
                // Якщо рахунок з API прилетів null (що навряд чи для FINISHED), страхуємося нулями
                const points = this.calculatePoints(
                  bet.homeScore,
                  bet.awayScore,
                  homeScore ?? 0,
                  awayScore ?? 0
                );

                transactionOperations.push(
                  this.prisma.bet.update({
                    where: { id: bet.id },
                    data: { pointsEarned: points },
                  })
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
