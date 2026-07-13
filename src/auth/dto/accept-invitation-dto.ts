import { IsString, IsNotEmpty, IsUUID, MinLength, Matches } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  public readonly name: string;

  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  public readonly surname: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak: must contain at least one uppercase letter and one number',
  })
  public readonly password: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak: must contain at least one uppercase letter and one number',
  })
  public readonly confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  public readonly token: string;
}
