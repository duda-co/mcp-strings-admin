export interface Config {
  stringsAdminHost: string;
  basePath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  httpTimeout: number;
}

export const config: Config = {
  stringsAdminHost: process.env.STRINGS_ADMIN_HOST || 'http://prd-ms-strings-admin-1.dudamobile.com',
  basePath: process.env.BASE_PATH || '/ms/strings-admin/internal/',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  httpTimeout: parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10)
}; 