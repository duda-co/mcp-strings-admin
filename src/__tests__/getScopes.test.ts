import { getScopesToolDefinition } from '../tools/getScopes';
import { httpClient } from '../utils/httpClient';
import { KeysScope } from '../types';

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

describe('getScopes Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have correct tool definition structure', () => {
    expect(getScopesToolDefinition.name).toBe('duda_strings_admin_get_all_scopes');
    expect(getScopesToolDefinition.description).toContain('scopes');
    expect(typeof getScopesToolDefinition.execute).toBe('function');
    expect(getScopesToolDefinition.parameters).toBeDefined();
  });

  test('should successfully retrieve scopes', async () => {
    const mockScopes: KeysScope[] = [
      { value: 'checkout', shouldTranslate: true },
      { value: 'ui', shouldTranslate: false },
      { value: 'admin', shouldTranslate: true }
    ];

    mockedHttpClient.get.mockResolvedValue(mockScopes);

    const result = await getScopesToolDefinition.execute();

    expect(mockedHttpClient.get).toHaveBeenCalledWith('/ms/strings-admin/internal/scopes/');
    expect(result).toEqual({
      type: "text",
      text: JSON.stringify(mockScopes)
    });
  });

  test('should return empty array when no scopes exist', async () => {
    const mockScopes: KeysScope[] = [];
    mockedHttpClient.get.mockResolvedValue(mockScopes);

    const result = await getScopesToolDefinition.execute();

    expect(result).toEqual({
      type: "text", 
      text: JSON.stringify([])
    });
  });

  test('should handle network errors gracefully', async () => {
    const errorMessage = 'Network timeout';
    mockedHttpClient.get.mockRejectedValue(new Error(errorMessage));

    await expect(getScopesToolDefinition.execute()).rejects.toThrow(
      'Failed to retrieve scopes: Network timeout'
    );

    expect(mockedHttpClient.get).toHaveBeenCalledWith('/ms/strings-admin/internal/scopes/');
  });

  test('should handle HTTP 500 errors', async () => {
    const error = {
      message: 'Internal Server Error',
      response: { status: 500 }
    };
    mockedHttpClient.get.mockRejectedValue(error);

    await expect(getScopesToolDefinition.execute()).rejects.toThrow(
      'Failed to retrieve scopes: Internal Server Error'
    );
  });

  test('should validate scope structure in response', async () => {
    const mockScopes: KeysScope[] = [
      { value: 'test-scope', shouldTranslate: true }
    ];

    mockedHttpClient.get.mockResolvedValue(mockScopes);

    const result = await getScopesToolDefinition.execute();
    
    expect(result).toEqual({
      type: "text",
      text: JSON.stringify(mockScopes)
    });
    
    // Parse the returned JSON to validate structure
    const parsedScopes = JSON.parse(result.text);
    expect(parsedScopes[0]).toHaveProperty('value');
    expect(parsedScopes[0]).toHaveProperty('shouldTranslate');
    expect(typeof parsedScopes[0].value).toBe('string');
    expect(typeof parsedScopes[0].shouldTranslate).toBe('boolean');
  });

  test('should accept empty parameters object', () => {
    const parseResult = getScopesToolDefinition.parameters.safeParse({});
    expect(parseResult.success).toBe(true);
  });

  test('should log performance metrics', async () => {
    const { logger } = require('../utils/logger');
    const mockScopes: KeysScope[] = [{ value: 'test', shouldTranslate: true }];
    mockedHttpClient.get.mockResolvedValue(mockScopes);

    await getScopesToolDefinition.execute();

    expect(logger.info).toHaveBeenCalledWith(
      'Getting all scopes',
      { tool: 'getScopes' }
    );
    
    expect(logger.info).toHaveBeenCalledWith(
      'Successfully retrieved scopes',
      expect.objectContaining({
        tool: 'getScopes',
        status: 'success',
        latency_ms: expect.any(Number),
        scopeCount: 1
      })
    );
  });
}); 