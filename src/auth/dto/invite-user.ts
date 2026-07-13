import { IsNotEmpty, IsEmail } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'The field is required' })
  email: string;
}
