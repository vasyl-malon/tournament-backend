import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddBonusPredictionDto {
  @IsOptional()
  @IsInt()
  championTeamId?: number;

  @IsOptional()
  @IsInt()
  runnerUpTeamId?: number;

  @IsOptional()
  @IsInt()
  topScorerId?: number;

  @IsString()
  @IsNotEmpty()
  tournamentId: string;
}
