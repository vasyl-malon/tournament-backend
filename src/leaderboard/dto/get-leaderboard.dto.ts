import { IsNotEmpty, IsString } from 'class-validator';

export class GetLeaderboardQueryDto {
  @IsNotEmpty({ message: 'tournamentId is required' })
  @IsString()
  tournamentId: string;
}
