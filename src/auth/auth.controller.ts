import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user-dto';
import { InviteUserDto } from './dto/invite-user';
import { RegisterDto } from './dto/register-dto';
import { AuthGuard, RolesGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  async login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @Post('/register')
  async acceptInvite(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('/admin/invite-user')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async send(@Body() dto: InviteUserDto) {
    return this.authService.sendInvitation(dto);
  }
}
