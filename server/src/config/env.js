function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEnvConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const config = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: toNumber(process.env.PORT, 3000),
    autoOpenBrowser: toBoolean(process.env.AUTO_OPEN_BROWSER, false),
    trustProxy: toBoolean(process.env.TRUST_PROXY, false),
    corsAllowedOrigins: toList(process.env.CORS_ALLOWED_ORIGINS),
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: toNumber(process.env.DB_PORT, 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'school_attendance',
      connectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-insecure-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      cookieName: process.env.COOKIE_NAME || 'auth_token',
      cookieSecure: toBoolean(process.env.COOKIE_SECURE, false),
      cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
      cookieMaxAgeMs: toNumber(process.env.COOKIE_MAX_AGE_MS, 8 * 60 * 60 * 1000),
    },
    diary: {
      baseUrl: process.env.DIARY_BASE_URL || '',
      token: process.env.DIARY_TOKEN || '',
      timeoutMs: toNumber(process.env.DIARY_TIMEOUT_MS, 5000),
    },
    sync: {
      intervalMs: toNumber(process.env.SYNC_INTERVAL_MS, 60000),
      batchSize: toNumber(process.env.SYNC_BATCH_SIZE, 100),
      maxAttempts: toNumber(process.env.SYNC_MAX_ATTEMPTS, 10),
    },
    internalApiKey: process.env.INTERNAL_API_KEY || '',
    rateLimit: {
      authWindowMs: toNumber(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 60_000),
      authMax: toNumber(process.env.RATE_LIMIT_AUTH_MAX, 15),
      deviceWindowMs: toNumber(process.env.RATE_LIMIT_DEVICE_WINDOW_MS, 60_000),
      deviceMax: toNumber(process.env.RATE_LIMIT_DEVICE_MAX, 300),
      internalWindowMs: toNumber(process.env.RATE_LIMIT_INTERNAL_WINDOW_MS, 60_000),
      internalMax: toNumber(process.env.RATE_LIMIT_INTERNAL_MAX, 30),
    },
  };

  if (config.isProduction && config.jwt.secret === 'dev-insecure-secret') {
    throw new Error('JWT_SECRET precisa ser configurada em producao');
  }

  return config;
}

module.exports = getEnvConfig();
