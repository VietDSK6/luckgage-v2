process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL =
  'postgresql://luckgage:luckgage_local@localhost:5433/luckgage?schema=public';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error';
