import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginUserDto } from './dto/login-user-dto';
import { AdminGuard } from './role-admin.guard';
import { InviteUserDto } from './dto/invite-user';
import { RegisterDto } from './dto/register-dto';

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

  @Post('/invite-user')
  @UseGuards(AuthGuard, AdminGuard)
  async send(@Body() dto: InviteUserDto) {
    return this.authService.sendInvitation(dto);
  }

  // @Get('/profile')
  // @UseGuards(AuthGuard)
  // async getProfile(@CurrentUser() user: { id: number }) {
  //   return this.authService.getProfile(user.id);
  // }
}
