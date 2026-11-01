export enum AppErrorCode {
  SupabaseNotConfigured = "SUPABASE_NOT_CONFIGURED",
  InvalidCredentials = "INVALID_CREDENTIALS",
  EmailConfirmationRequired = "EMAIL_CONFIRMATION_REQUIRED",
  EmailAlreadyRegistered = "EMAIL_ALREADY_REGISTERED",
  PasswordTooWeak = "PASSWORD_TOO_WEAK",
  NetworkUnavailable = "NETWORK_UNAVAILABLE",
  SessionExpired = "SESSION_EXPIRED",
  SchemaTableMissing = "SCHEMA_TABLE_MISSING",
  RateLimited = "RATE_LIMITED",
  AccessDenied = "ACCESS_DENIED",
  Unknown = "UNKNOWN_ERROR",
}

export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.SupabaseNotConfigured]:
    "Guruplay is temporarily unavailable. Please try again shortly.",
  [AppErrorCode.InvalidCredentials]: "The email or password is incorrect.",
  [AppErrorCode.EmailConfirmationRequired]:
    "Check your inbox and confirm your email address before logging in.",
  [AppErrorCode.EmailAlreadyRegistered]:
    "An account already exists for this email address.",
  [AppErrorCode.PasswordTooWeak]:
    "Password is too weak. Use at least 6 characters.",
  [AppErrorCode.NetworkUnavailable]:
    "Network request failed. Check your connection and try again.",
  [AppErrorCode.SessionExpired]:
    "Your session has expired. Please log in again.",
  [AppErrorCode.SchemaTableMissing]:
    "We couldn’t load this part of Guruplay. Please try again later.",
  [AppErrorCode.RateLimited]:
    "Too many attempts. Wait a few minutes before trying again.",
  [AppErrorCode.AccessDenied]:
    "Your account doesn’t have access to this action. Contact support if you need help.",
  [AppErrorCode.Unknown]: "Something went wrong. Please try again.",
};

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message = APP_ERROR_MESSAGES[code]) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export const getAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  if (
    ["PGRST205", "42P01"].includes(code) ||
    message.includes("could not find the table")
  ) {
    return new AppError(AppErrorCode.SchemaTableMissing);
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return new AppError(AppErrorCode.InvalidCredentials);
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed"))
    return new AppError(AppErrorCode.EmailConfirmationRequired);

  if (
    ["over_request_rate_limit", "over_email_send_rate_limit"].includes(code) ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  )
    return new AppError(AppErrorCode.RateLimited);

  if (code === "42501" || message.includes("row-level security"))
    return new AppError(AppErrorCode.AccessDenied);

  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already registered")
  ) {
    return new AppError(AppErrorCode.EmailAlreadyRegistered);
  }

  if (
    message.includes("password") &&
    (message.includes("weak") || message.includes("6 characters"))
  ) {
    return new AppError(AppErrorCode.PasswordTooWeak);
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return new AppError(AppErrorCode.NetworkUnavailable);
  }

  if (message.includes("jwt") || message.includes("session")) {
    return new AppError(AppErrorCode.SessionExpired);
  }

  return new AppError(AppErrorCode.Unknown);
};

export const isSchemaTableMissingError = (error: unknown) =>
  getAppError(error).code === AppErrorCode.SchemaTableMissing;
