import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { verify } from 'jsonwebtoken';

export const jwtConstants = {
  secret: process.env.JWT_TOKEN,
  expiresIn: '7d',
};

export const getToken = (request: any) => {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  if (!authHeader) {
    throw new UnauthorizedException('No Authorization header');
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    throw new UnauthorizedException('Invalid Authorization header format');
  }

  return token;
};

export const validateRequest = (request: any) => {
  const token = getToken(request);

  try {
    const payload = verify(token, process.env.JWT_TOKEN) as any;
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  } catch (err) {
    throw new UnauthorizedException('Invalid or expired token');
  }
};

export const validateRole = (request: any) => {
  const token = getToken(request);

  try {
    const payload = verify(token, process.env.JWT_TOKEN) as any;
    return payload.role === UserRole.ADMIN;
  } catch (err) {
    throw new UnauthorizedException('Invalid or expired token');
  }
};
