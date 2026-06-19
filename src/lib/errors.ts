export enum AppErrorCode {
  SupabaseNotConfigured = 'SUPABASE_NOT_CONFIGURED',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  EmailAlreadyRegistered = 'EMAIL_ALREADY_REGISTERED',
  PasswordTooWeak = 'PASSWORD_TOO_WEAK',
  NetworkUnavailable = 'NETWORK_UNAVAILABLE',
  SessionExpired = 'SESSION_EXPIRED',
  Unknown = 'UNKNOWN_ERROR',
}

export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.SupabaseNotConfigured]: 'Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
  [AppErrorCode.InvalidCredentials]: 'The email or password is incorrect.',
  [AppErrorCode.EmailAlreadyRegistered]: 'An account already exists for this email address.',
  [AppErrorCode.PasswordTooWeak]: 'Password is too weak. Use at least 6 characters.',
  [AppErrorCode.NetworkUnavailable]: 'Network request failed. Check your connection and try again.',
  [AppErrorCode.SessionExpired]: 'Your session has expired. Please log in again.',
  [AppErrorCode.Unknown]: 'Something went wrong. Please try again.',
};

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message = APP_ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export const getAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials')) {
    return new AppError(AppErrorCode.InvalidCredentials);
  }

  if (message.includes('already registered') || message.includes('already been registered') || message.includes('user already registered')) {
    return new AppError(AppErrorCode.EmailAlreadyRegistered);
  }

  if (message.includes('password') && (message.includes('weak') || message.includes('6 characters'))) {
    return new AppError(AppErrorCode.PasswordTooWeak);
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return new AppError(AppErrorCode.NetworkUnavailable);
  }

  if (message.includes('jwt') || message.includes('session')) {
    return new AppError(AppErrorCode.SessionExpired);
  }

  return new AppError(AppErrorCode.Unknown, error instanceof Error ? error.message : APP_ERROR_MESSAGES[AppErrorCode.Unknown]);
};
