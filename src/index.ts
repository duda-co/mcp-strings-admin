#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { getScopesToolDefinition } from './tools/getScopes';
import { createStringToolDefinition } from './tools/createString';
import { createBulkStringsToolDefinition } from './tools/createBulkStrings';
import { logger } from './utils/logger';
import { config } from './config';

async function main() {
  try {
    // Log startup configuration (non-sensitive values only)
    logger.info('Starting strings-admin-mcp server', {
      version: '0.1.0',
      stringsAdminHost: config.stringsAdminHost,
      basePath: config.basePath,
      logLevel: config.logLevel,
      httpTimeout: config.httpTimeout
    });

    // Create FastMCP server instance
    const server = new FastMCP({
      name: 'strings-admin-mcp',
      version: '0.1.0'
    });

    // Register tools
    server.addTool(getScopesToolDefinition);
    server.addTool(createStringToolDefinition);
    server.addTool(createBulkStringsToolDefinition);

    logger.info('Tools registered successfully', {
      tools: [
        getScopesToolDefinition.name,
        createStringToolDefinition.name,
        createBulkStringsToolDefinition.name
      ]
    });

    // Start server with SDIO transport
    await server.start({ transportType: 'stdio' });
    
    logger.info('MCP server started successfully with SDIO transport');
  } catch (error: any) {
    logger.error('Failed to start MCP server', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
}); 