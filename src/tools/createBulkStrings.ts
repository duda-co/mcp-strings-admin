import { z } from 'zod';
import { config } from '../config';
import { httpClient } from '../utils/httpClient';
import { logger } from '../utils/logger';
import { MCPBulkStringData } from '../types';

export const createBulkStringsToolDefinition = {
  name: 'duda_strings_admin_create_bulk_string_keys',
  description: 'Creates multiple string keys at once in the same scope. WORKFLOW: 1) First call duda_strings_admin_get_all_scopes to see available scopes, 2) Choose appropriate scope, 3) Use the scope "value" field as "scopeValue" parameter. KEY FORMAT: All keys MUST start with "ui.ed." prefix (e.g., ui.ed.button.save, ui.ed.error.invalid_email). This tool is efficient for creating many related keys in the same scope.',
  parameters: z.object({
    keys: z.array(z.object({
      key: z.string().describe('String identifier. MUST start with "ui.ed." prefix. Format: ui.ed.{category}.{specific_name}. Examples: ui.ed.button.save, ui.ed.error.invalid_email'),
      value: z.string().describe('The actual display text for this string')
    })).min(1).describe('Array of key-value pairs to create. Each key must be unique and follow naming conventions.'),
    shouldTranslate: z.boolean().default(true).describe('Whether all these strings should be translated to other languages'),
    scopeValue: z.string().describe('Target scope name. Use the "value" field from duda_strings_admin_get_all_scopes response')
  }),
  execute: async (args: MCPBulkStringData) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating bulk string keys', { 
        tool: 'createBulkStrings',
        keyCount: args.keys.length,
        scopeValue: args.scopeValue,
        keys: args.keys.map(k => k.key)
      });

      // Validate key format for all keys
      const invalidKeys = args.keys.filter(item => !item.key.startsWith('ui.ed.'));
      if (invalidKeys.length > 0) {
        throw new Error(`Invalid key format. Keys must start with "ui.ed." prefix. Invalid keys: ${invalidKeys.map(k => k.key).join(', ')}`);
      }

      // Check for duplicate keys in the request
      const keyNames = args.keys.map(k => k.key);
      const duplicateKeys = keyNames.filter((key, index) => keyNames.indexOf(key) !== index);
      if (duplicateKeys.length > 0) {
        throw new Error(`Duplicate keys found in request: ${[...new Set(duplicateKeys)].join(', ')}`);
      }

      const results = [];
      const errors = [];

      // Process each key individually to provide detailed error handling
      for (const keyData of args.keys) {
        try {
          const payload = {
            key: keyData.key,
            value: keyData.value,
            shouldTranslate: args.shouldTranslate
          };
          
          await httpClient.post(`${config.basePath}keys/${args.scopeValue}`, payload);
          results.push(keyData.key);
          
          logger.debug('Successfully created string key', {
            tool: 'createBulkStrings',
            key: keyData.key,
            scopeValue: args.scopeValue
          });
        } catch (error: any) {
          const status = error.response?.status;
          let errorMessage = `Failed to create key '${keyData.key}': `;
          
          if (status === 400) {
            errorMessage += `Invalid request: ${error.response?.data?.message || error.message}`;
          } else if (status === 404) {
            errorMessage += `Scope '${args.scopeValue}' not found`;
          } else if (status === 409) {
            errorMessage += `Key already exists in scope '${args.scopeValue}'`;
          } else {
            errorMessage += error.message;
          }
          
          errors.push(errorMessage);
          
          logger.warn('Failed to create individual string key', {
            tool: 'createBulkStrings',
            key: keyData.key,
            scopeValue: args.scopeValue,
            error: error.message,
            httpStatus: status
          });
        }
      }
      
      const latency = Date.now() - startTime;
      logger.info('Completed bulk string key creation', {
        tool: 'createBulkStrings',
        status: errors.length === 0 ? 'success' : 'partial_success',
        latency_ms: latency,
        totalKeys: args.keys.length,
        successfulKeys: results.length,
        failedKeys: errors.length,
        scopeValue: args.scopeValue
      });

      // Format response based on results
      if (errors.length === 0) {
        return {
          type: "text" as const,
          text: `Successfully created ${results.length} string keys in scope '${args.scopeValue}': ${results.join(', ')}`
        };
      } else if (results.length === 0) {
        throw new Error(`Failed to create any string keys:\n${errors.join('\n')}`);
      } else {
        return {
          type: "text" as const,
          text: `Partially completed: ${results.length} keys created successfully, ${errors.length} failed.\n\nSuccessful: ${results.join(', ')}\n\nErrors:\n${errors.join('\n')}`
        };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      logger.error('Failed to create bulk string keys', {
        tool: 'createBulkStrings',
        status: 'error',
        latency_ms: latency,
        error: error.message,
        scopeValue: args.scopeValue,
        keyCount: args.keys.length
      });
      
      throw error;
    }
  }
}; 