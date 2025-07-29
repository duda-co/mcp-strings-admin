import { createStringToolDefinition } from '../tools/createString';
import { httpClient } from '../utils/httpClient';
import { MCPStringData } from '../types';

// Mock the HTTP client
jest.mock('../utils/httpClient');
const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Mock logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('createString Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have correct tool definition structure', () => {
    expect(createStringToolDefinition.name).toBe('duda_strings_admin_create_new_string_key');
    expect(createStringToolDefinition.description).toContain('Creates');
    expect(typeof createStringToolDefinition.execute).toBe('function');
    expect(createStringToolDefinition.parameters).toBeDefined();
  });

  test('should validate parameters schema correctly', () => {
    const validData = {
      key: 'order.status.completed',
      value: 'Order Completed',
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    const result = createStringToolDefinition.parameters.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('should reject invalid parameters', () => {
    const invalidData = {
      key: '', // empty key should fail
      value: 'Test Value',
      scopeValue: 'test-scope'
    };

    const result = createStringToolDefinition.parameters.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('should use default shouldTranslate value', () => {
    const dataWithoutTranslate = {
      key: 'test.key',
      value: 'Test Value',
      scopeValue: 'test-scope'
    };

    const result = createStringToolDefinition.parameters.safeParse(dataWithoutTranslate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shouldTranslate).toBe(false); // default value
    }
  });

  test('should successfully create string key', async () => {
    const stringData: MCPStringData = {
      key: 'order.status.completed',
      value: 'Order Completed',
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    mockedHttpClient.post.mockResolvedValue(null);

    const result = await createStringToolDefinition.execute(stringData);

    expect(mockedHttpClient.post).toHaveBeenCalledWith(
      '/ms/strings-admin/internal/keys/checkout',
      {
        key: 'order.status.completed',
        value: 'Order Completed',
        shouldTranslate: true
      }
    );
    expect(result).toEqual({
      type: "text",
      text: "String key created successfully"
    });
  });

  test('should handle 400 Bad Request error', async () => {
    const stringData: MCPStringData = {
      key: 'invalid.key',
      value: 'Test Value',
      shouldTranslate: false,
      scopeValue: 'invalid-scope'
    };

    const error = {
      message: 'Bad Request',
      response: { 
        status: 400,
        data: { message: 'Invalid key format' }
      }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createStringToolDefinition.execute(stringData)).rejects.toThrow(
      'Invalid request: Invalid key format'
    );
  });

  test('should handle 404 Scope Not Found error', async () => {
    const stringData: MCPStringData = {
      key: 'test.key',
      value: 'Test Value',
      shouldTranslate: false,
      scopeValue: 'nonexistent-scope'
    };

    const error = {
      message: 'Not Found',
      response: { status: 404 }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createStringToolDefinition.execute(stringData)).rejects.toThrow(
      "Scope 'nonexistent-scope' not found"
    );
  });

  test('should handle 409 Key Already Exists error', async () => {
    const stringData: MCPStringData = {
      key: 'existing.key',
      value: 'Test Value',
      shouldTranslate: false,
      scopeValue: 'checkout'
    };

    const error = {
      message: 'Conflict',
      response: { status: 409 }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createStringToolDefinition.execute(stringData)).rejects.toThrow(
      "Key 'existing.key' already exists in scope 'checkout'"
    );
  });

  test('should handle generic network errors', async () => {
    const stringData: MCPStringData = {
      key: 'test.key',
      value: 'Test Value',
      shouldTranslate: false,
      scopeValue: 'test-scope'
    };

    const error = {
      message: 'Network timeout',
      response: { status: 500 }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createStringToolDefinition.execute(stringData)).rejects.toThrow(
      'Failed to create string key: Network timeout'
    );
  });

  test('should validate parameter length constraints', () => {
    // Test key length constraint (max 200)
    const longKey = 'a'.repeat(201);
    const result1 = createStringToolDefinition.parameters.safeParse({
      key: longKey,
      value: 'Test',
      scopeValue: 'test'
    });
    expect(result1.success).toBe(false);

    // Test value length constraint (max 1000)
    const longValue = 'a'.repeat(1001);
    const result2 = createStringToolDefinition.parameters.safeParse({
      key: 'test.key',
      value: longValue,
      scopeValue: 'test'
    });
    expect(result2.success).toBe(false);

    // Test scope length constraint (max 50)
    const longScope = 'a'.repeat(51);
    const result3 = createStringToolDefinition.parameters.safeParse({
      key: 'test.key',
      value: 'Test',
      scopeValue: longScope
    });
    expect(result3.success).toBe(false);
  });

  test('should log performance metrics', async () => {
    const { logger } = require('../utils/logger');
    const stringData: MCPStringData = {
      key: 'test.key',
      value: 'Test Value',
      shouldTranslate: false,
      scopeValue: 'test-scope'
    };

    mockedHttpClient.post.mockResolvedValue(null);

    await createStringToolDefinition.execute(stringData);

    expect(logger.info).toHaveBeenCalledWith(
      'Creating new string key',
      {
        tool: 'createString',
        key: 'test.key',
        scopeValue: 'test-scope'
      }
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Successfully created string key',
      expect.objectContaining({
        tool: 'createString',
        status: 'success',
        latency_ms: expect.any(Number),
        key: 'test.key',
        scopeValue: 'test-scope'
      })
    );
  });
}); 