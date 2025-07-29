import winston from 'winston';

// Mock winston to avoid actual logging during tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create winston logger with correct configuration', () => {
    // Import after mocking
    require('../utils/logger');

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'info', // default log level from config
      format: winston.format.combine(),
      transports: [expect.any(winston.transports.Console)]
    });
  });

  test('should configure console transport with stderr levels', () => {
    require('../utils/logger');

    expect(winston.transports.Console).toHaveBeenCalledWith({
      stderrLevels: ['error', 'warn', 'info', 'debug']
    });
  });

  test('logger should be exported and usable', () => {
    const { logger } = require('../utils/logger');
    
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });
}); 