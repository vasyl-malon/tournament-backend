import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 5)
  apiCode: string;
}
