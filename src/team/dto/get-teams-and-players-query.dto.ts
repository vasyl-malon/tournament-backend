import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetTeamsAndPlayersQueryDto {
  @IsNotEmpty({ message: 'tournamentId is required' })
  @IsString()
  tournamentId: string;

  @IsOptional()
  @IsString()
  search?: string;
}
