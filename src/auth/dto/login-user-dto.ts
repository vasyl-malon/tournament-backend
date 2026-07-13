import { IsString, IsEmail, Length } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  public readonly email: string;

  @IsString()
  @Length(8, 50, { message: 'Password must be between 8 and 50 characters' })
  public readonly password: string;
}
