import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetPredictionsQueryDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  tournamentId: string;
}

export class GetBonusPredictionsQueryDto {
  @IsNotEmpty()
  @IsString()
  tournamentId: string;
}
