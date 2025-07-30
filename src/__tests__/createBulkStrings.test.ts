import { createBulkStringsToolDefinition } from '../tools/createBulkStrings';
import { httpClient } from '../utils/httpClient';
import { MCPBulkStringData } from '../types';

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

describe('createBulkStrings Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have correct tool definition structure', () => {
    expect(createBulkStringsToolDefinition.name).toBe('duda_strings_admin_create_bulk_string_keys');
    expect(createBulkStringsToolDefinition.description).toContain('Creates multiple string keys');
    expect(typeof createBulkStringsToolDefinition.execute).toBe('function');
    expect(createBulkStringsToolDefinition.parameters).toBeDefined();
  });

  test('should validate parameters schema correctly', () => {
    const validData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    const result = createBulkStringsToolDefinition.parameters.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('should reject empty keys array', () => {
    const invalidData = {
      keys: [], // empty array should fail
      shouldTranslate: true,
      scopeValue: 'test-scope'
    };

    const result = createBulkStringsToolDefinition.parameters.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('should reject invalid key structure', () => {
    const invalidData = {
      keys: [
        { key: 'ui.ed.button.save' } // missing value
      ],
      shouldTranslate: true,
      scopeValue: 'test-scope'
    };

    const result = createBulkStringsToolDefinition.parameters.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('should use default shouldTranslate value', () => {
    const dataWithoutTranslate = {
      keys: [
        { key: 'ui.ed.test.key', value: 'Test Value' }
      ],
      scopeValue: 'test-scope'
    };

    const result = createBulkStringsToolDefinition.parameters.safeParse(dataWithoutTranslate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shouldTranslate).toBe(true); // default value
    }
  });

  test('should successfully create all string keys', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    mockedHttpClient.post.mockResolvedValue(null);

    const result = await createBulkStringsToolDefinition.execute(bulkData);

    expect(mockedHttpClient.post).toHaveBeenCalledTimes(2);
    expect(mockedHttpClient.post).toHaveBeenCalledWith(
      '/ms/strings-admin/internal/keys/checkout',
      {
        key: 'ui.ed.button.save',
        value: 'Save',
        shouldTranslate: true
      }
    );
    expect(mockedHttpClient.post).toHaveBeenCalledWith(
      '/ms/strings-admin/internal/keys/checkout',
      {
        key: 'ui.ed.button.cancel',
        value: 'Cancel',
        shouldTranslate: true
      }
    );
    expect(result).toEqual({
      type: "text",
      text: "Successfully created 2 string keys in scope 'checkout': ui.ed.button.save, ui.ed.button.cancel"
    });
  });

  test('should reject keys without ui.ed. prefix', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'invalid.key', value: 'Invalid' },
        { key: 'ui.ed.button.save', value: 'Save' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Invalid key format. Keys must start with "ui.ed." prefix. Invalid keys: invalid.key'
    );

    expect(mockedHttpClient.post).not.toHaveBeenCalled();
  });

  test('should reject duplicate keys in request', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.save', value: 'Save Again' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Duplicate keys found in request: ui.ed.button.save'
    );

    expect(mockedHttpClient.post).not.toHaveBeenCalled();
  });

  test('should handle partial success with some failures', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' },
        { key: 'ui.ed.error.existing', value: 'Existing Key' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    // First two calls succeed, third fails with 409
    mockedHttpClient.post
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce({
        message: 'Conflict',
        response: { status: 409 }
      });

    const result = await createBulkStringsToolDefinition.execute(bulkData);

    expect(mockedHttpClient.post).toHaveBeenCalledTimes(3);
    expect(result.text).toContain('Partially completed: 2 keys created successfully, 1 failed');
    expect(result.text).toContain('Successful: ui.ed.button.save, ui.ed.button.cancel');
    expect(result.text).toContain("Key already exists in scope 'checkout'");
  });

  test('should handle complete failure', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' }
      ],
      shouldTranslate: true,
      scopeValue: 'nonexistent-scope'
    };

    // All calls fail with 404
    mockedHttpClient.post.mockRejectedValue({
      message: 'Not Found',
      response: { status: 404 }
    });

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Failed to create any string keys'
    );

    expect(mockedHttpClient.post).toHaveBeenCalledTimes(2);
  });

  test('should handle 400 Bad Request error', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.invalid.key', value: 'Invalid' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    const error = {
      message: 'Bad Request',
      response: { 
        status: 400,
        data: { message: 'Invalid key format' }
      }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Failed to create any string keys'
    );
  });

  test('should handle 404 Scope Not Found error', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.test.key', value: 'Test' }
      ],
      shouldTranslate: true,
      scopeValue: 'nonexistent-scope'
    };

    const error = {
      message: 'Not Found',
      response: { status: 404 }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Failed to create any string keys'
    );
  });

  test('should handle generic network errors', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.test.key', value: 'Test' }
      ],
      shouldTranslate: true,
      scopeValue: 'test-scope'
    };

    const error = {
      message: 'Network timeout',
      response: { status: 500 }
    };
    mockedHttpClient.post.mockRejectedValue(error);

    await expect(createBulkStringsToolDefinition.execute(bulkData)).rejects.toThrow(
      'Failed to create any string keys'
    );
  });

  test('should log performance metrics and key details', async () => {
    const { logger } = require('../utils/logger');
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    mockedHttpClient.post.mockResolvedValue(null);

    await createBulkStringsToolDefinition.execute(bulkData);

    expect(logger.info).toHaveBeenCalledWith(
      'Creating bulk string keys',
      {
        tool: 'createBulkStrings',
        keyCount: 2,
        scopeValue: 'checkout',
        keys: ['ui.ed.button.save', 'ui.ed.button.cancel']
      }
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Completed bulk string key creation',
      expect.objectContaining({
        tool: 'createBulkStrings',
        status: 'success',
        latency_ms: expect.any(Number),
        totalKeys: 2,
        successfulKeys: 2,
        failedKeys: 0,
        scopeValue: 'checkout'
      })
    );
  });

  test('should log individual key creation in debug mode', async () => {
    const { logger } = require('../utils/logger');
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' }
      ],
      shouldTranslate: false,
      scopeValue: 'test-scope'
    };

    mockedHttpClient.post.mockResolvedValue(null);

    await createBulkStringsToolDefinition.execute(bulkData);

    expect(logger.debug).toHaveBeenCalledWith(
      'Successfully created string key',
      {
        tool: 'createBulkStrings',
        key: 'ui.ed.button.save',
        scopeValue: 'test-scope'
      }
    );
  });

  test('should handle mixed success scenarios correctly', async () => {
    const bulkData: MCPBulkStringData = {
      keys: [
        { key: 'ui.ed.button.save', value: 'Save' },
        { key: 'ui.ed.button.cancel', value: 'Cancel' },
        { key: 'ui.ed.error.existing', value: 'Existing' },
        { key: 'ui.ed.button.submit', value: 'Submit' }
      ],
      shouldTranslate: true,
      scopeValue: 'checkout'
    };

    // Success, Success, Failure (409), Success
    mockedHttpClient.post
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce({
        message: 'Conflict',
        response: { status: 409 }
      })
      .mockResolvedValueOnce(null);

    const result = await createBulkStringsToolDefinition.execute(bulkData);

    expect(result.text).toContain('Partially completed: 3 keys created successfully, 1 failed');
    expect(result.text).toContain('Successful: ui.ed.button.save, ui.ed.button.cancel, ui.ed.button.submit');
    expect(result.text).toContain("Failed to create key 'ui.ed.error.existing'");
  });
}); 