import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { InvitationStatus, User, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/integrations/mail/mail.service';
import { InviteUserDto } from './dto/invite-user';
import { RegisterDto } from './dto/register-dto';
import { LoginUserDto } from './dto/login-user-dto';
import {
  ACCOUNT_LOCK_MINUTES,
  AuthErrors,
  INVITATION_EXPIRES_IN_DAYS,
  MAX_LOGIN_ATTEMPTS,
} from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token: dto.token,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new BadRequestException(AuthErrors.INVALID_INVITATION);
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException(AuthErrors.PASSWORDS_DO_NOT_MATCH);
    }

    const passwordHash = await this.hashPassword(dto.password);

    const { user, token: jwtToken } = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.upsert({
        where: { email: invitation.email },
        create: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.ACTIVE,
        },
        update: {
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            userId: updatedUser.id,
            tournamentId: invitation.tournamentId,
          },
        },
        create: {
          userId: updatedUser.id,
          tournamentId: invitation.tournamentId,
        },
        update: {},
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.USED },
      });

      const token = await this.generateToken(updatedUser);

      return { user: updatedUser, token };
    });

    return {
      token: jwtToken,
      // 5. Повертаємо ID турніру напряму з інвайту
      lastTournamentId: invitation.tournamentId,
      user: {
        email: user.email,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async generateToken(user: User): Promise<string> {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_TOKEN,
      {
        expiresIn: '7d',
      },
    );
  }

  async login({ email, password }: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const now = new Date();
    const fakePassword = '$2b$10$fakehashtofooltheattacker';

    if (!user) {
      await bcrypt.compare(password, fakePassword);
      throw new UnauthorizedException(AuthErrors.INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      throw new UnauthorizedException({
        message: AuthErrors.ACCOUNT_LOCKED,
        retryAt: user.lockedUntil,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');

    if (!isPasswordValid) {
      const exceededLockTime = user.lockedUntil && user.lockedUntil <= now;
      const attempts = exceededLockTime ? 1 : user.failedLoginAttempts + 1;
      const isLocking = attempts >= MAX_LOGIN_ATTEMPTS;

      const lockedUntilDate = isLocking
        ? new Date(now.getTime() + ACCOUNT_LOCK_MINUTES * 60_000)
        : exceededLockTime
          ? null
          : user.lockedUntil;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockedUntilDate,
        },
      });

      if (isLocking) {
        throw new UnauthorizedException({
          message: AuthErrors.ACCOUNT_LOCKED,
          retryAt: lockedUntilDate,
        });
      }

      const attemptsLeft = MAX_LOGIN_ATTEMPTS - attempts;
      const showAttempts = attemptsLeft <= 3;

      throw new UnauthorizedException({
        message: AuthErrors.INVALID_CREDENTIALS,
        ...(showAttempts && { attemptsLeft }),
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      include: {
        tournaments: {
          orderBy: {
            tournament: { createdAt: 'desc' },
          },
          take: 1,
        },
      },
    });

    const token = await this.generateToken(updatedUser);

    return {
      token,
      lastTournamentId: updatedUser.tournaments[0]?.tournamentId ?? null,
      user: {
        email: updatedUser.email,
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      },
    };
  }
}
