import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddPredictionDto {
  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;

  @IsOptional()
  @IsString()
  predictedAdvancingTeamId?: number;
}
