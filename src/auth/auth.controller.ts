import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginUserDto } from './dto/login-user-dto';
import { AdminGuard } from './role-admin.guard';
import { InviteUserDto } from './dto/invite-user';
import { AcceptInvitationDto } from './dto/accept-invitation-dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // @Post('/signup')
  // async register(@Body() userDto: LoginUserDto) {
  //   return this.authService.register(userDto);
  // }

  @Post('/login')
  async login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  // @Post('/verify-otp')
  // async checkOtp(@Body() dto: OtpDto) {
  //   return this.authService.verifyOtp(dto);
  // }

  @Post('/accept-invitation')
  async acceptInvite(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
  }

  @Get('/test')
  async test() {
    return [
      {
        id: 1,
      },
      {
        id: 2,
      },
      {
        id: 3,
      },
    ];
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

  // @Get('/verify-token')
  // async verifyToken(@Query('token') token: string) {
  //   return this.authService.verifyToken(token);
  // }

  // @Post('/complete-registration')
  // async completeRegistration(@Query('token') token: string, @Body() dto: CompleteRegistrationDto) {
  //   return this.authService.completeRegistration(token, dto);
  // }
}
