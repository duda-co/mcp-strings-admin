import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from './logger';

class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.stringsAdminHost,
      timeout: config.httpTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'strings-admin-mcp/v0.1.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((request) => {
      logger.debug('HTTP Request', { 
        method: request.method, 
        url: request.url,
        data: request.data 
      });
      return request;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('HTTP Response', { 
          status: response.status, 
          url: response.config.url 
        });
        return response;
      },
      (error) => {
        logger.error('HTTP Error', { 
          message: error.message,
          status: error.response?.status,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url);
    return response.data;
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }
}

export const httpClient = new HttpClient(); 