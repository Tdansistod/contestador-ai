import 'dotenv/config';

/**
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string}
 */
function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * @param {string} name
 * @param {string} fallback
 * @returns {string}
 */
function optional(name, fallback) {
  return process.env[name] ?? fallback;
}

const config = {
  port: Number(optional('PORT', '3000')),
  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') !== 'production',

  databaseUrl: required('DATABASE_URL', 'postgres://contestador:contestador@localhost:5432/contestador'),

  publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:3000'),

  ml: {
    appId: optional('ML_APP_ID', ''),
    clientSecret: optional('ML_CLIENT_SECRET', ''),
    redirectUri: optional('ML_REDIRECT_URI', ''),
  },

  tokenEncKey: optional('TOKEN_ENC_KEY', ''),
  adminKey: optional('ADMIN_KEY', ''),

  llm: {
    provider: optional('LLM_PROVIDER', 'mock'), // mock | anthropic
    model: optional('LLM_MODEL', ''),
    anthropicApiKey: optional('ANTHROPIC_API_KEY', ''),
  },
};

export default config;
