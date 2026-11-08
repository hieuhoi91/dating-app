import { validateEnvironment } from './validate-environment.js';

describe('validateEnvironment', () => {
  const validEnvironment = {
    DATABASE_URL: 'postgresql://dating:secret@localhost:5432/dating',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:3000',
    CLOUDINARY_URL: 'cloudinary://api-key:api-secret@cloud-name',
  };

  it('accepts configured backend settings and defaults the port', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      PORT: 4000,
      DATABASE_POOL_MAX: 10,
    });
  });

  it('rejects missing database and JWT configuration', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: undefined,
      }),
    ).toThrow('DATABASE_URL must be configured.');

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow('JWT_ACCESS_SECRET must contain at least 32 characters.');
  });

  it('rejects wildcard and invalid CORS origins', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        CORS_ORIGIN: '*',
      }),
    ).toThrow('CORS_ORIGIN contains an invalid origin: *');
  });

  it('rejects an oversized database connection pool', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_POOL_MAX: '100',
      }),
    ).toThrow('DATABASE_POOL_MAX must be an integer between 1 and 50.');
  });
});
