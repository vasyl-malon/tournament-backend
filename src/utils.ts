import { firstValueFrom } from 'rxjs';

const BASE_URL = 'https://api.football-data.org/v4';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const callFootballApi = async (url: string) => {
  const { data } = await firstValueFrom(
    this.httpService.get(`${BASE_URL}${url}`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '',
      },
    }),
  );

  return data;
};
