import { z } from 'zod';
import { config } from '../config';
import { httpClient } from '../utils/httpClient';
import { logger } from '../utils/logger';
import { MCPStringData } from '../types';

export const createStringToolDefinition = {
  name: 'duda_strings_admin_create_new_string_key',
  description: 'Creates a new string key inside a specified scope. WORKFLOW: 1) First call duda_strings_admin_get_all_scopes to see available scopes, 2) Choose appropriate scope, 3) Use the scope "value" field as "scopeValue" parameter. KEY FORMAT: Must start with "ui.ed." prefix (e.g., ui.ed.button.save, ui.ed.error.invalid_email). Suffix is developer choice - verify naming with team.',
  parameters: z.object({
    key: z.string().describe('String identifier. MUST start with "ui.ed." prefix. Format: ui.ed.{category}.{specific_name}. Examples: ui.ed.button.save, ui.ed.error.invalid_email'),
    value: z.string().describe('The actual display text for this string'),
    shouldTranslate: z.boolean().default(true).describe('Whether this string should be translated to other languages'),
    scopeValue: z.string().describe('Target scope name. Use the "value" field from duda_strings_admin_get_all_scopes response')
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