import { IsInt, Min } from 'class-validator';

export class PlaceBetDto {
  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;
}
