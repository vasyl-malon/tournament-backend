export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 15;
export const INVITATION_EXPIRES_IN_DAYS = 2;

export const AuthErrors = {
  USER_ALREADY_EXISTS: 'A user with this email address already exists.',
  INVALID_INVITATION: 'Your invitation link is invalid or has expired.',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
  ACCOUNT_LOCKED:
    'Your account has been temporarily locked due to multiple failed sign-in attempts. Please try again later.',
} as const;
