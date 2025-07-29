# strings-admin-mcp LLM Execution Plan
## Automated Implementation Tasks

This document provides precise implementation instructions for LLMs to execute the strings-admin-mcp project using the **fastmcp** framework.

---

## 📋 Project Overview

**Implementation Goal**: Create a Node.js MCP server using fastmcp that exposes two tools (`getScopes`, `createString`) as a façade to the existing Java strings-admin service.

**Technical Stack**:
- fastmcp framework for MCP server implementation
- Zod for schema validation (integrated with fastmcp)
- axios for HTTP client
- winston for structured logging
- TypeScript for type safety

---

## 🤖 LLM Implementation Tasks

### Phase 1: Project Foundation & Setup

#### Task 1.1: Initialize Project Structure and Dependencies

**LLM Instructions**: Execute these commands and create these files exactly as specified.

**Commands to Execute**:
```bash
# Create project directory and navigate
mkdir -p mcp-strings-admin
cd mcp-strings-admin

# Initialize npm project
npm init -y

# Install production dependencies
npm install fastmcp zod axios winston

# Install development dependencies  
npm install -D typescript @types/node jest ts-jest @types/jest eslint prettier

# Create directory structure
mkdir -p src/{tools,types,config,utils}
```

**Files to Create**:

**`package.json` scripts section**:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  }
}
```

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`.gitignore`**:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

**Validation Check**: Run `npm install` and `npm run build` - both should complete successfully.

---

#### Task 1.2: Create Configuration and Logging Infrastructure

**LLM Instructions**: Create these exact files with the specified content.

**File: `src/config/index.ts`**:
```typescript
export interface Config {
  stringsAdminHost: string;
  basePath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  httpTimeout: number;
}

export const config: Config = {
  stringsAdminHost: process.env.STRINGS_ADMIN_HOST || 'http://172.31.45.202',
  basePath: process.env.BASE_PATH || '/ms/strings-admin/internal/',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  httpTimeout: parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10)
};
```

**File: `src/utils/logger.ts`**:
```typescript
import winston from 'winston';
import { config } from '../config';

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug']
    })
  ]
});
```

**File: `src/types/index.ts`**:
```typescript
export interface KeysScope {
  value: string;
  shouldTranslate: boolean;
}

export interface MCPStringData {
  key: string;
  value: string;
  shouldTranslate: boolean;
  scopeValue: string;
}
```

---

### Phase 2: Tool Implementation

#### Task 2.1: Create HTTP Client Utility

**LLM Instructions**: Create the HTTP client utility that both tools will use.

**File: `src/utils/httpClient.ts`**:
```typescript
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
```

---

#### Task 2.2: Implement getScopes Tool

**LLM Instructions**: Create the getScopes tool implementation.

**File: `src/tools/getScopes.ts`**:
```typescript
import { z } from 'zod';
import { config } from '../config';
import { httpClient } from '../utils/httpClient';
import { logger } from '../utils/logger';
import { KeysScope } from '../types';

export const getScopesToolDefinition = {
  name: 'duda_strings_admin_get_all_scopes',
  description: 'Retrieves all available scopes so that clients can decide where to add keys',
  parameters: z.object({}),
  execute: async (): Promise<KeysScope[]> => {
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
      
      return scopes;
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
```

#### Task 2.3: Implement createString Tool

**LLM Instructions**: Create the createString tool implementation.

**File: `src/tools/createString.ts`**:
```typescript
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
  execute: async (args: MCPStringData): Promise<null> => {
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
      
      return null;
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
```

---

### Phase 3: Main Server Implementation

#### Task 3.1: Create Main Server Entry Point

**LLM Instructions**: Create the main server file that ties everything together.

**File: `src/index.ts`**:
```typescript
import { FastMCP } from 'fastmcp';
import { getScopesToolDefinition } from './tools/getScopes';
import { createStringToolDefinition } from './tools/createString';
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
      version: '0.1.0',
      description: 'MCP server for Duda strings admin service'
    });

    // Register tools
    server.addTool(getScopesToolDefinition);
    server.addTool(createStringToolDefinition);

    logger.info('Tools registered successfully', {
      tools: [
        getScopesToolDefinition.name,
        createStringToolDefinition.name
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
```

**Validation Command**: 
```bash
npm run build && node dist/index.js
```
The server should start and wait for MCP messages on stdin.

---

### Phase 4: Testing & Validation

#### Task 4.1: Create Basic Test Suite

**LLM Instructions**: Create a basic test suite to validate the implementation.

**File: `jest.config.js`**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**Create test directory**: `mkdir -p src/__tests__`

**File: `src/__tests__/tools.test.ts`**:
```typescript
import { getScopesToolDefinition } from '../tools/getScopes';
import { createStringToolDefinition } from '../tools/createString';

describe('Tool Definitions', () => {
  test('getScopes tool should have correct structure', () => {
    expect(getScopesToolDefinition.name).toBe('duda_strings_admin_get_all_scopes');
    expect(getScopesToolDefinition.description).toContain('scopes');
    expect(typeof getScopesToolDefinition.execute).toBe('function');
  });

  test('createString tool should have correct structure', () => {
    expect(createStringToolDefinition.name).toBe('duda_strings_admin_create_new_string_key');
    expect(createStringToolDefinition.description).toContain('Creates');
    expect(typeof createStringToolDefinition.execute).toBe('function');
  });

  test('createString parameters schema should validate correctly', () => {
    const result = createStringToolDefinition.parameters.safeParse({
      key: 'test.key',
      value: 'Test Value',
      shouldTranslate: true,
      scopeValue: 'test-scope'
    });
    
    expect(result.success).toBe(true);
  });

  test('createString should reject invalid parameters', () => {
    const result = createStringToolDefinition.parameters.safeParse({
      key: '', // empty key should fail
      value: 'Test Value',
      scopeValue: 'test-scope'
    });
    
    expect(result.success).toBe(false);
  });
});
```

**Validation Command**:
```bash
npm test
```

---

### Phase 5: Production Setup

#### Task 5.1: Create Docker Container

**LLM Instructions**: Create a production-ready Docker container.

**File: `Dockerfile`**:
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# No ports exposed (SDIO only)
# Environment variables will be injected at runtime

# Start the application
CMD ["node", "dist/index.js"]
```

**File: `.dockerignore`**:
```
node_modules
dist
.git
.gitignore
README.md
Dockerfile
.dockerignore
npm-debug.log
.nyc_output
coverage
.env
```

#### Task 5.2: Create Documentation and Usage Examples

**LLM Instructions**: Create comprehensive documentation.

**File: `README.md`**:
```markdown
# strings-admin-mcp

Model Context Protocol (MCP) server for Duda strings admin service.

## Quick Start

### Prerequisites
- Node.js 20+ LTS
- Access to Duda strings-admin Java service

### Local Development
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build  

# Start server
npm start
```

### Docker Usage
```bash
# Build image
docker build -t strings-admin-mcp .

# Run container with environment variables
docker run \
  -e STRINGS_ADMIN_HOST=http://your-java-service \
  -e LOG_LEVEL=info \
  strings-admin-mcp
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STRINGS_ADMIN_HOST` | `http://172.31.45.202` | Java service base URL |
| `BASE_PATH` | `/ms/strings-admin/internal/` | API base path |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `HTTP_TIMEOUT_MS` | `5000` | HTTP request timeout |

## MCP Tools

### duda_strings_admin_get_all_scopes
Retrieves all available scopes.

**Parameters**: None

**Returns**: Array of scope objects
```json
[
  {
    "value": "checkout", 
    "shouldTranslate": true
  }
]
```

### duda_strings_admin_create_new_string_key  
Creates a new string key in a scope.

**Parameters**:
- `key` (string, 1-200 chars): The key identifier
- `value` (string, 1-1000 chars): The string value  
- `shouldTranslate` (boolean, optional): Whether to translate (default: false)
- `scopeValue` (string, 1-50 chars): Target scope name

**Returns**: `null` on success

## Claude Desktop Integration

Add to your Claude Desktop config:
```json
{
  "mcpServers": {
    "strings-admin": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "STRINGS_ADMIN_HOST": "http://your-java-service",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Development

```bash
# Run tests
npm test

# Development mode with auto-reload
npm run dev

# Type checking
npx tsc --noEmit
```

## Architecture

- **FastMCP**: Simplified MCP server framework
- **Zod**: Runtime schema validation
- **Axios**: HTTP client for Java service calls
- **Winston**: Structured JSON logging to stderr
- **TypeScript**: Type safety and modern JS features
```

---

### Phase 6: Documentation & Validation

#### Task 6.1: End-to-End Demo Implementation
**Priority**: High | **Estimated Effort**: 2-3 hours

**Description**: Create comprehensive demo showing MCP server integration with Claude Desktop and tool usage.

**Acceptance Criteria**:
- [ ] Claude Desktop configuration
- [ ] Demo script with realistic scenarios
- [ ] Documentation with screenshots/examples
- [ ] Validation of all acceptance criteria

**Definition of Done**:
- [ ] Claude Desktop `.claude_config` configuration:
  - [ ] MCP server registration with correct command
  - [ ] Environment variable configuration
  - [ ] SDIO transport setup
- [ ] Demo scenarios implemented:
  - [ ] **Scenario 1**: List all available scopes using `getScopes`
  - [ ] **Scenario 2**: Create new string key in existing scope
  - [ ] **Scenario 3**: Handle error cases (invalid scope, duplicate key)
  - [ ] **Scenario 4**: End-to-end workflow from scope discovery to key creation
- [ ] Demo documentation:
  - [ ] Step-by-step setup instructions
  - [ ] Expected outputs and responses
  - [ ] Troubleshooting common issues
  - [ ] Performance expectations
- [ ] Validation checklist:
  - [ ] ✅ Binary starts with no args and reads from stdin
  - [ ] ✅ `getScopes` returns identical data to direct Java service call
  - [ ] ✅ `createString` successfully creates keys
  - [ ] ✅ Invalid schema produces `invalid_request` MCP error
  - [ ] ✅ Claude Desktop integration functional
- [ ] Performance validation:
  - [ ] Tool call overhead <100ms (excluding network)
  - [ ] Memory usage stable during extended operation
  - [ ] No memory leaks during repeated operations

---

#### Task 6.2: Comprehensive Documentation
**Priority**: Medium | **Estimated Effort**: 3-4 hours

**Description**: Create complete documentation including API reference, deployment guide, and troubleshooting.

**Acceptance Criteria**:
- [ ] README with complete setup instructions
- [ ] API documentation for both tools
- [ ] Deployment and configuration guide
- [ ] Troubleshooting and FAQ section

**Definition of Done**:
- [ ] `README.md` containing:
  - [ ] Project overview and purpose
  - [ ] Prerequisites and installation
  - [ ] Quick start guide
  - [ ] Configuration options
  - [ ] Usage examples
  - [ ] Development setup instructions
- [ ] `API.md` with detailed tool documentation:
  - [ ] Tool schemas and parameter descriptions
  - [ ] Request/response examples
  - [ ] Error codes and handling
  - [ ] Rate limiting and performance notes
- [ ] `DEPLOYMENT.md` covering:
  - [ ] Environment setup
  - [ ] Docker deployment
  - [ ] Production configuration
  - [ ] Monitoring and logging setup
  - [ ] Security considerations
- [ ] `TROUBLESHOOTING.md` including:
  - [ ] Common error scenarios and solutions
  - [ ] Java service connectivity issues
  - [ ] MCP client integration problems
  - [ ] Performance optimization tips
  - [ ] Debug mode usage
- [ ] Code documentation:
  - [ ] JSDoc comments for all public APIs
  - [ ] Type definitions with descriptions
  - [ ] Configuration schema documentation
- [ ] Validation: Documentation complete and accurate for external users

---

## 🎯 Success Metrics & Acceptance Criteria

### Overall Project Success Criteria

1. **Functional Requirements Met**:
   - [ ] Both MCP tools (`getScopes`, `createString`) implemented and functional
   - [ ] SDIO transport working correctly
   - [ ] Error handling comprehensive and spec-compliant
   - [ ] Configuration system robust and validated

2. **Non-Functional Requirements Met**:
   - [ ] Performance: <100ms processing overhead per tool call
   - [ ] Reliability: >99% uptime in CI environment
   - [ ] Security: No network exposure, proper input validation
   - [ ] Observability: Structured logging with all required fields

3. **Integration Success**:
   - [ ] Claude Desktop integration functional
   - [ ] Java service connectivity reliable
   - [ ] Docker container production-ready
   - [ ] Documentation complete and usable

4. **Quality Assurance**:
   - [ ] Test coverage >80%
   - [ ] All linting and type checking passing
   - [ ] No security vulnerabilities in dependencies
   - [ ] Performance benchmarks met

---

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 1 day | None (fastmcp simplifies setup) |
| Phase 2: Tools | 1-2 days | Phase 1 complete (fastmcp reduces boilerplate) |
| Phase 3: Configuration | 1 day | Phase 1 complete |
| Phase 4: Integration & Testing | 2-3 days | Phases 1-2 complete |
| Phase 5: Deployment | 1-2 days | Phase 4 complete |
| Phase 6: Documentation | 1-2 days | All phases complete |

**Total Estimated Duration**: 6-10 days (reduced due to fastmcp framework efficiencies)

---

## 🔧 Technical Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Runtime | Node.js 20+ LTS | fastmcp requirement, modern async support |
| Language | TypeScript 5+ | Type safety, better developer experience |
| MCP Framework | fastmcp | Simplified MCP server development, built on official SDK |
| HTTP Client | axios | Robust, well-tested, good TypeScript support |
| Validation | zod | Runtime type validation, integrated with fastmcp |
| Logging | winston | Structured logging, multiple transports |
| Testing | Jest + ts-jest | TypeScript integration, comprehensive features |
| Container | Node Alpine/Distroless | Security and minimal footprint |

---

## ⚠️ Risk Considerations

1. **Java Service Dependency**: Ensure Java service availability and API stability
2. **fastmcp Framework Dependency**: Monitor framework updates and compatibility
3. **Performance Requirements**: Network latency may impact 100ms goal
4. **Security**: Input validation critical for preventing injection attacks (mitigated by Zod integration)
5. **Operational**: Proper monitoring essential for production deployment

---

*This execution plan provides a comprehensive roadmap for implementing the strings-admin-mcp server according to the PRD requirements with clear Definition of Done criteria for each task.*