import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUser } from 'src/decorators/get-user.decorator';
import { GetMatchesQueryDto } from './dto/get-matches-query.dto';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  async getAllMatches(@GetUser('id') userId: string, @Query() query: GetMatchesQueryDto) {
    return this.matchService.getAll(userId, query);
  }
}
