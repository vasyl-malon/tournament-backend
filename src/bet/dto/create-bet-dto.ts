import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBetDto {
  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;
}