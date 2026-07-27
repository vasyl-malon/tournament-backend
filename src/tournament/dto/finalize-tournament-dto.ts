import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class FinalizeTournamentDto {
  @IsNumber()
  @IsNotEmpty()
  championTeamId: number;

  @IsNumber()
  @IsNotEmpty()
  runnerUpTeamId: number;

  @IsNumber()
  @IsNotEmpty()
  topScorerId: number;
}
