// Mock FastMCP before importing
jest.mock('fastmcp', () => ({
  FastMCP: jest.fn().mockImplementation(() => ({
    addTool: jest.fn(),
    run: jest.fn(),
  }))
}));

// Mock tools
jest.mock('../tools/getScopes', () => ({
  getScopesToolDefinition: {
    name: 'duda_strings_admin_get_all_scopes',
    description: 'Test getScopes tool',
    execute: jest.fn()
  }
}));

jest.mock('../tools/createString', () => ({
  createStringToolDefinition: {
    name: 'duda_strings_admin_create_new_string_key', 
    description: 'Test createString tool',
    execute: jest.fn()
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }
}));

// Mock process.exit to prevent actual exit during tests
const mockExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
  throw new Error(`Process exit called with code ${code}`);
}) as any);

describe('Main Server', () => {
  let mockServerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServerInstance = {
      addTool: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined)
    };
    
    const { FastMCP } = require('fastmcp');
    FastMCP.mockImplementation(() => mockServerInstance);
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('should create FastMCP server with correct configuration', async () => {
    // Import and run main function
    const mainModule = require('../index');

    const { FastMCP } = require('fastmcp');
    expect(FastMCP).toHaveBeenCalledWith({
      name: 'strings-admin-mcp',
      version: '0.1.0'
    });
  });

  test('should register both tools', async () => {
    const { getScopesToolDefinition } = require('../tools/getScopes');
    const { createStringToolDefinition } = require('../tools/createString');
    
    // Import triggers the main function
    require('../index');

    expect(mockServerInstance.addTool).toHaveBeenCalledWith(getScopesToolDefinition);
    expect(mockServerInstance.addTool).toHaveBeenCalledWith(createStringToolDefinition);
    expect(mockServerInstance.addTool).toHaveBeenCalledTimes(3);
  });

  test('should start server with STDIO transport', async () => {
    // Import triggers the main function
    require('../index');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServerInstance.start).toHaveBeenCalledWith({ transportType: 'stdio' });
  });

  test('should log startup configuration', async () => {
    const { logger } = require('../utils/logger');
    
    // Import triggers the main function
    require('../index');

    expect(logger.info).toHaveBeenCalledWith(
      'Starting strings-admin-mcp server',
      expect.objectContaining({
        version: '0.1.0',
        stringsAdminHost: 'http://prd-ms-strings-admin-1.dudamobile.com',
        basePath: '/ms/strings-admin/internal/',
        logLevel: 'info',
        httpTimeout: 5000
      })
    );
  });

  test('should log successful tool registration', async () => {
    const { logger } = require('../utils/logger');
    
    // Import triggers the main function
    require('../index');

    expect(logger.info).toHaveBeenCalledWith(
      'Tools registered successfully',
      {
        tools: [
          'duda_strings_admin_get_all_scopes',
          'duda_strings_admin_create_new_string_key',
          'duda_strings_admin_create_bulk_string_keys'
        ]
      }
    );
  });

  test('should log successful server start', async () => {
    const { logger } = require('../utils/logger');
    
    // Import triggers the main function
    require('../index');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.info).toHaveBeenCalledWith(
      'MCP server started successfully with SDIO transport'
    );
  });

  test('should handle server startup errors', async () => {
    const { logger } = require('../utils/logger');
    const startError = new Error('Failed to start server');
    
    mockServerInstance.start.mockRejectedValue(startError);

    // Import should trigger error handling
    try {
      require('../index');
      await new Promise(resolve => setTimeout(resolve, 0));
    } catch (error: any) {
      expect(error.message).toContain('Process exit called with code 1');
    }

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to start MCP server',
      expect.objectContaining({
        error: 'Failed to start server',
        stack: expect.any(String)
      })
    );
  });

  test('should handle tool registration errors', async () => {
    const { logger } = require('../utils/logger');
    const toolError = new Error('Failed to register tool');
    
    mockServerInstance.addTool.mockImplementation(() => {
      throw toolError;
    });

    try {
      require('../index');
      await new Promise(resolve => setTimeout(resolve, 0));
    } catch (error: any) {
      expect(error.message).toContain('Process exit called with code 1');
    }

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to start MCP server',
      expect.objectContaining({
        error: 'Failed to register tool',
        stack: expect.any(String)
      })
    );
  });
}); 