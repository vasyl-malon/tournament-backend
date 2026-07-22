import { IsInt, IsNotEmpty } from 'class-validator';

export class PlaceBonusPredictionsDto {
  @IsInt()
  championTeamId: number;

  @IsInt()
  runnerUpTeamId: number;

  @IsInt()
  topScorerId: number;

  @IsInt()
  @IsNotEmpty()
  tournamentId: string;
}
