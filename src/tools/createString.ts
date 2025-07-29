import { z } from 'zod';
import { config } from '../config';
import { httpClient } from '../utils/httpClient';
import { logger } from '../utils/logger';
import { MCPStringData } from '../types';

export const createStringToolDefinition = {
  name: 'duda_strings_admin_create_new_string_key',
  description: 'Creates a new string key inside a specified scope',
  parameters: z.object({
    key: z.string().min(1).max(200),
    value: z.string().min(1).max(1000),
    shouldTranslate: z.boolean().default(false),
    scopeValue: z.string().min(1).max(50)
  }),
  execute: async (args: MCPStringData) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating new string key', { 
        tool: 'createString',
        key: args.key,
        scopeValue: args.scopeValue 
      });
      
      // Map to Java DTO format
      const payload = {
        key: args.key,
        value: args.value,
        shouldTranslate: args.shouldTranslate
      };
      
      await httpClient.post(`${config.basePath}keys/${args.scopeValue}`, payload);
      
      const latency = Date.now() - startTime;
      logger.info('Successfully created string key', {
        tool: 'createString',
        status: 'success',
        latency_ms: latency,
        key: args.key,
        scopeValue: args.scopeValue
      });
      
      return {
        type: "text" as const,
        text: "String key created successfully"
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      const status = error.response?.status;
      
      logger.error('Failed to create string key', {
        tool: 'createString',
        status: 'error',
        latency_ms: latency,
        error: error.message,
        key: args.key,
        scopeValue: args.scopeValue,
        httpStatus: status
      });
      
      // Map HTTP errors to meaningful messages
      if (status === 400) {
        throw new Error(`Invalid request: ${error.response?.data?.message || error.message}`);
      } else if (status === 404) {
        throw new Error(`Scope '${args.scopeValue}' not found`);
      } else if (status === 409) {
        throw new Error(`Key '${args.key}' already exists in scope '${args.scopeValue}'`);
      } else {
        throw new Error(`Failed to create string key: ${error.message}`);
      }
    }
  }
}; 