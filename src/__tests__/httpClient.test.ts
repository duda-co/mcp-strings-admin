import axios from 'axios';

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
    // Mock axios.create before any imports that use it
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  test('should create axios instance with correct configuration', () => {
    // Setup mock before importing
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Import triggers the constructor
    const { httpClient } = require('../utils/httpClient');

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://prd-ms-strings-admin-1.dudamobile.com',
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

    const { httpClient } = require('../utils/httpClient');
    const result = await httpClient.get('/test-endpoint');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint');
    expect(result).toEqual(mockData);
  });

  test('should successfully make POST request', async () => {
    const mockData = null;
    const postData = { key: 'test.key', value: 'Test Value' };
    mockAxiosInstance.post.mockResolvedValue({ data: mockData });

    const { httpClient } = require('../utils/httpClient');
    const result = await httpClient.post('/test-endpoint', postData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test-endpoint', postData);
    expect(result).toEqual(mockData);
  });

  test('should handle GET request errors', async () => {
    const errorMessage = 'Network Error';
    mockAxiosInstance.get.mockRejectedValue(new Error(errorMessage));

    const { httpClient } = require('../utils/httpClient');
    await expect(httpClient.get('/test-endpoint')).rejects.toThrow(errorMessage);
  });

  test('should handle POST request errors', async () => {
    const errorMessage = 'Server Error';
    mockAxiosInstance.post.mockRejectedValue(new Error(errorMessage));

    const { httpClient } = require('../utils/httpClient');
    await expect(httpClient.post('/test-endpoint', {})).rejects.toThrow(errorMessage);
  });

  test('should setup request and response interceptors', () => {
    // Setup mock first
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    require('../utils/httpClient');

    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });
}); 