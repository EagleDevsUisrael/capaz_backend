import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Valores solo para pruebas (la base es PGlite en memoria; ver src/test/testApp.ts)
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/unused',
      ID_CARD_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
      ADMIN_TOKEN: 'test-admin-token-123',
      EXPOSE_DEV_LOGIN_CODE: 'true',
    },
  },
})
