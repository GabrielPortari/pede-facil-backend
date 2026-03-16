import {
  createSwaggerBasicAuthMiddleware,
  resolveCorsOrigins,
  resolveEnvironment,
  shouldEnableSwagger,
  shouldProtectSwagger,
} from './edge-hardening';

describe('edge hardening helpers', () => {
  it('resolves development as default environment', () => {
    expect(resolveEnvironment(undefined)).toBe('development');
  });

  it('enables swagger only for development and staging', () => {
    expect(shouldEnableSwagger('development')).toBe(true);
    expect(shouldEnableSwagger('staging')).toBe(true);
    expect(shouldEnableSwagger('production')).toBe(false);
  });

  it('protects swagger only for staging', () => {
    expect(shouldProtectSwagger('staging')).toBe(true);
    expect(shouldProtectSwagger('development')).toBe(false);
  });

  it('parses configured cors origins', () => {
    expect(resolveCorsOrigins('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('uses restrictive fallback cors origins', () => {
    expect(resolveCorsOrigins(undefined)).toEqual([
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:19006',
    ]);
  });

  it('requires auth header for swagger basic auth middleware', () => {
    const middleware = createSwaggerBasicAuthMiddleware('admin', 'secret');
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;
    const next = jest.fn();

    middleware({ headers: {} } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
