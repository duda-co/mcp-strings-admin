import { z } from 'zod';
import { config } from '../config';
import { httpClient } from '../utils/httpClient';
import { logger } from '../utils/logger';
import { KeysScope } from '../types';

export const getScopesToolDefinition = {
  name: 'duda_strings_admin_get_all_scopes',
  description: 'Retrieves all available scopes where string keys can be created. Use this first to see available scope options, then use the "value" field from the response as "scopeValue" when creating new string keys.',
  parameters: z.object({}),
  execute: async () => {
    const startTime = Date.now();
    
    try {
      logger.info('Getting all scopes', { tool: 'getScopes' });
      
      const scopes = await httpClient.get<KeysScope[]>(`${config.basePath}scopes/`);
      
      const latency = Date.now() - startTime;
      logger.info('Successfully retrieved scopes', {
        tool: 'getScopes',
        status: 'success', 
        latency_ms: latency,
        scopeCount: scopes.length
      });
      
      return {
        type: "text" as const,
        text: JSON.stringify(scopes)
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      logger.error('Failed to retrieve scopes', {
        tool: 'getScopes',
        status: 'error',
        latency_ms: latency,
        error: error.message
      });
      
      throw new Error(`Failed to retrieve scopes: ${error.message}`);
    }
  }
}; 