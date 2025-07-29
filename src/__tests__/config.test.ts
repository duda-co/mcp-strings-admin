import { config, Config } from '../config';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should have correct default values', () => {
    expect(config.stringsAdminHost).toBe('http://172.31.45.202');
    expect(config.basePath).toBe('/ms/strings-admin/internal/');
    expect(config.logLevel).toBe('info');
    expect(config.httpTimeout).toBe(5000);
  });

  test('should override values from environment variables', () => {
    process.env.STRINGS_ADMIN_HOST = 'http://localhost:8080';
    process.env.BASE_PATH = '/custom/path/';
    process.env.LOG_LEVEL = 'debug';
    process.env.HTTP_TIMEOUT_MS = '10000';

    // Re-require the module to pick up new env vars
    jest.resetModules();
    const { config: newConfig } = require('../config');

    expect(newConfig.stringsAdminHost).toBe('http://localhost:8080');
    expect(newConfig.basePath).toBe('/custom/path/');
    expect(newConfig.logLevel).toBe('debug');
    expect(newConfig.httpTimeout).toBe(10000);
  });

  test('should handle invalid timeout values gracefully', () => {
    process.env.HTTP_TIMEOUT_MS = 'invalid';
    
    jest.resetModules();
    const { config: newConfig } = require('../config');

    expect(newConfig.httpTimeout).toBe(NaN); // parseInt returns NaN for invalid strings
  });

  test('Config interface should have required properties', () => {
    const testConfig: Config = {
      stringsAdminHost: 'test',
      basePath: 'test',
      logLevel: 'warn',
      httpTimeout: 1000
    };

    expect(testConfig).toBeDefined();
    expect(testConfig.logLevel).toBe('warn');
  });
}); 