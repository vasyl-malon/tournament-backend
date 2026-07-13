import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';

const PASSWORD_REGEX =
  /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name is too short' })
  public readonly firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name is too short' })
  public readonly lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password can only contain English letters, numbers, and special characters',
  })
  public readonly password: string;

  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password' })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password can only contain English letters, numbers, and special characters',
  })
  public readonly confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  public readonly token: string;
}