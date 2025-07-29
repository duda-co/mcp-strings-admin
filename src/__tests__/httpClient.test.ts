import axios from 'axios';
import { httpClient } from '../utils/httpClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HTTP Client', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  test('should create axios instance with correct configuration', () => {
    // Import triggers the constructor
    require('../utils/httpClient');

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://172.31.45.202',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'strings-admin-mcp/v0.1.0'
      }
    });
  });

  test('should successfully make GET request', async () => {
    const mockData = [{ value: 'checkout', shouldTranslate: true }];
    mockAxiosInstance.get.mockResolvedValue({ data: mockData });

    const result = await httpClient.get('/test-endpoint');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint');
    expect(result).toEqual(mockData);
  });

  test('should successfully make POST request', async () => {
    const mockData = null;
    const postData = { key: 'test.key', value: 'Test Value' };
    mockAxiosInstance.post.mockResolvedValue({ data: mockData });

    const result = await httpClient.post('/test-endpoint', postData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test-endpoint', postData);
    expect(result).toEqual(mockData);
  });

  test('should handle GET request errors', async () => {
    const errorMessage = 'Network Error';
    mockAxiosInstance.get.mockRejectedValue(new Error(errorMessage));

    await expect(httpClient.get('/test-endpoint')).rejects.toThrow(errorMessage);
  });

  test('should handle POST request errors', async () => {
    const errorMessage = 'Server Error';
    mockAxiosInstance.post.mockRejectedValue(new Error(errorMessage));

    await expect(httpClient.post('/test-endpoint', {})).rejects.toThrow(errorMessage);
  });

  test('should setup request and response interceptors', () => {
    require('../utils/httpClient');

    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });
}); 