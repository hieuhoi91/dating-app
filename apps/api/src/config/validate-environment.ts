export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl = environment.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL must be configured.');
  }
  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
  }

  const jwtSecret = environment.JWT_ACCESS_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }

  const port = Number(environment.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  const databasePoolMax = Number(environment.DATABASE_POOL_MAX ?? 10);
  if (
    !Number.isInteger(databasePoolMax) ||
    databasePoolMax < 1 ||
    databasePoolMax > 50
  ) {
    throw new Error('DATABASE_POOL_MAX must be an integer between 1 and 50.');
  }

  if (
    environment.DATABASE_SSL !== undefined &&
    environment.DATABASE_SSL !== 'true' &&
    environment.DATABASE_SSL !== 'false'
  ) {
    throw new Error('DATABASE_SSL must be true or false.');
  }

  const sameSite = environment.AUTH_COOKIE_SAME_SITE ?? 'lax';
  if (
    typeof sameSite !== 'string' ||
    !['strict', 'lax', 'none'].includes(sameSite)
  ) {
    throw new Error('AUTH_COOKIE_SAME_SITE must be strict, lax, or none.');
  }
  if (sameSite === 'none' && environment.NODE_ENV !== 'production') {
    throw new Error('AUTH_COOKIE_SAME_SITE=none requires NODE_ENV=production.');
  }

  const corsOrigins = environment.CORS_ORIGIN;
  if (typeof corsOrigins !== 'string' || corsOrigins.trim() === '') {
    throw new Error('CORS_ORIGIN must contain one or more allowed origins.');
  }
  for (const origin of corsOrigins.split(',').map((value) => value.trim())) {
    try {
      const parsedOrigin = new URL(origin);
      if (
        !['http:', 'https:'].includes(parsedOrigin.protocol) ||
        parsedOrigin.origin !== origin
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(`CORS_ORIGIN contains an invalid origin: ${origin}`);
    }
  }

  const smtpKeys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
  ] as const;
  const resendApiKey = environment.RESEND_API_KEY;
  const useResendApi =
    typeof resendApiKey === 'string' && resendApiKey.trim() !== '';
  const configuredSmtpKeys = smtpKeys.filter((key) => {
    const value = environment[key];
    return typeof value === 'string' && value.trim() !== '';
  });
  if (
    !useResendApi &&
    configuredSmtpKeys.length > 0 &&
    configuredSmtpKeys.length !== smtpKeys.length
  ) {
    const missing = smtpKeys.filter((key) => !configuredSmtpKeys.includes(key));
    throw new Error(`SMTP configuration is incomplete. Missing: ${missing.join(', ')}.`);
  }
  const smtpPort = environment.SMTP_PORT;
  if (useResendApi || configuredSmtpKeys.length === smtpKeys.length) {
    if (
      typeof environment.SMTP_FROM !== 'string' ||
      environment.SMTP_FROM.trim() === ''
    ) {
      throw new Error('SMTP_FROM is required when email delivery is configured.');
    }
    if (
      typeof environment.WEB_APP_URL !== 'string' ||
      environment.WEB_APP_URL.trim() === ''
    ) {
      throw new Error('WEB_APP_URL is required when email delivery is configured.');
    }
    const webAppUrl = new URL(String(environment.WEB_APP_URL));
    if (
      !['http:', 'https:'].includes(webAppUrl.protocol) ||
      webAppUrl.origin !== environment.WEB_APP_URL
    ) {
      throw new Error('WEB_APP_URL must be an origin such as https://example.com.');
    }
  }
  if (!useResendApi && configuredSmtpKeys.length === smtpKeys.length) {
    const parsedSmtpPort = Number(smtpPort);
    if (!Number.isInteger(parsedSmtpPort) || parsedSmtpPort < 1 || parsedSmtpPort > 65535) {
      throw new Error('SMTP_PORT must be a valid TCP port.');
    }
    if (environment.SMTP_SECURE !== 'true' && environment.SMTP_SECURE !== 'false') {
      throw new Error('SMTP_SECURE must be true or false.');
    }
    environment.SMTP_PORT = parsedSmtpPort;
  }

  const googleKeys = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ] as const;
  const configuredGoogleKeys = googleKeys.filter((key) => {
    const value = environment[key];
    return typeof value === 'string' && value.trim() !== '';
  });
  if (configuredGoogleKeys.length > 0 && configuredGoogleKeys.length !== googleKeys.length) {
    const missing = googleKeys.filter((key) => !configuredGoogleKeys.includes(key));
    throw new Error(`Google OAuth configuration is incomplete. Missing: ${missing.join(', ')}.`);
  }
  if (configuredGoogleKeys.length === googleKeys.length) {
    const callbackUrl = new URL(String(environment.GOOGLE_CALLBACK_URL));
    if (!['http:', 'https:'].includes(callbackUrl.protocol)) {
      throw new Error('GOOGLE_CALLBACK_URL must use HTTP or HTTPS.');
    }
  }

  if (environment.CLOUDINARY_URL !== undefined) {
    if (typeof environment.CLOUDINARY_URL !== 'string') {
      throw new Error('CLOUDINARY_URL must be a string.');
    }
    try {
      const cloudinaryUrl = new URL(environment.CLOUDINARY_URL);
      if (
        cloudinaryUrl.protocol !== 'cloudinary:' ||
        !cloudinaryUrl.hostname ||
        !cloudinaryUrl.username ||
        !cloudinaryUrl.password
      ) {
        throw new Error();
      }
    } catch {
      throw new Error('CLOUDINARY_URL must be a valid cloudinary:// URL.');
    }
  }

  return {
    ...environment,
    PORT: port,
    DATABASE_POOL_MAX: databasePoolMax,
    AUTH_COOKIE_SAME_SITE: sameSite,
    ...(!useResendApi && configuredSmtpKeys.length > 0
      ? { SMTP_PORT: Number(smtpPort) }
      : {}),
  };
}
