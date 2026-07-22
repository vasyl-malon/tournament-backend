import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { User, UserStatus } from '@prisma/client';
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

  generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  async sendInvitation(body: InviteUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new BadRequestException(AuthErrors.USER_ALREADY_EXISTS);
    }

    const token = this.generateInvitationToken();

    return this.prisma
      .$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: body.email,
            status: UserStatus.PENDING,
          },
        });

        await tx.invitation.create({
          data: {
            email: body.email,
            token,
            expiresAt: new Date(Date.now() + INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
          },
        });

        return user;
      })
      .then(async (user) => {
        try {
          await this.mail.sendInvitation(body.email, token);
        } catch (error) {
          console.error('Failed to send email:', error);
        }

        return user;
      });
  }

  async register(dto: RegisterDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        token: dto.token,
        usedAt: null,
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

    const user = await this.prisma.user.update({
      where: { email: invitation.email },
      data: {
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.ACTIVE,
      },
      include: {
        tournaments: {
          orderBy: {
            tournament: {
              createdAt: 'desc',
            },
          },
          take: 1,
        },
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    const token = await this.generateToken(user);

    return {
      token,
      lastTournamentId: user.tournaments.length ? user.tournaments[0].tournamentId : null,
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
        where: {
          id: user.id,
        },
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
      where: {
        id: user.id,
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      include: {
        tournaments: {
          orderBy: {
            tournament: {
              createdAt: 'desc',
            },
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
