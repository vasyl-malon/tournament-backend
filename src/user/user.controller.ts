import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards';
import { Roles } from 'src/decorators';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getActiveUsers(
    @Query('query') query: string,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.userService.getActiveUsers(query, tournamentId);
  }
}
