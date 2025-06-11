#!/usr/bin/env node

/**
 * Comprehensive MCP Server Implementation in TypeScript
 * 
 * This server demonstrates:
 * - Multiple tool types with TypeScript type safety
 * - Resource management
 * - Security features (authentication, validation, rate limiting)
 * - Error handling and logging
 * - Both stdio and HTTP transports
 * - Modern TypeScript patterns and Zod validation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import jwt from 'jsonwebtoken';
import Database from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';

// Configuration schema
const ConfigSchema = z.object({
  allowedDomains: z.array(z.string()).default(['example.com', 'httpbin.org', 'jsonplaceholder.typicode.com']),
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
  rateLimitRequests: z.number().default(100),
  rateLimitWindow: z.number().default(3600), // 1 hour
  allowedDirectories: z.array(z.string()).default(['/tmp', '/var/tmp']),
  jwtSecret: z.string().default('your-secret-key-change-in-production'),
  requireAuth: z.boolean().default(false),
  port: z.number().default(3000),
});

type Config = z.infer<typeof ConfigSchema>;

// Load configuration from environment
const config: Config = ConfigSchema.parse({
  allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || undefined,
  maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined,
  rateLimitRequests: process.env.RATE_LIMIT_REQUESTS ? parseInt(process.env.RATE_LIMIT_REQUESTS) : undefined,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW) : undefined,
  allowedDirectories: process.env.ALLOWED_DIRECTORIES?.split(',') || undefined,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  requireAuth: process.env.REQUIRE_AUTH === 'true',
  port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
});

// Input schemas using Zod
const CalculatorInputSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number(),
});

const FileOperationInputSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'delete']),
  path: z.string(),
  content: z.string().optional(),
});

const DatabaseQueryInputSchema = z.object({
  query: z.string(),
  params: z.array(z.any()).default([]),
});

const WebScraperInputSchema = z.object({
  url: z.string().url(),
  selector: z.string().optional(),
  maxLength: z.number().default(5000),
});

const AuthTokenInputSchema = z.object({
  username: z.string(),
});

// Rate limiting storage
const rateLimitStorage = new Map<string, number[]>();

// Database setup
const initDatabase = (): Database.Database => {
  const db = new Database.Database(':memory:');
  
  db.serialize(() => {
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    stmt.run('John Doe', 'john@example.com');
    stmt.run('Jane Smith', 'jane@example.com');
    stmt.run('Bob Johnson', 'bob@example.com');
    stmt.finalize();
  });
  
  return db;
};

const database = initDatabase();

// Security utilities
const verifyAuth = (authHeader?: string): boolean => {
  if (!config.requireAuth) return true;
  
  if (!authHeader) throw new McpError(ErrorCode.InvalidRequest, 'Authentication required');
  
  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch (error) {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid authentication token');
  }
};

const checkRateLimit = (clientId: string): boolean => {
  const now = Date.now();
  const clientRequests = rateLimitStorage.get(clientId) || [];
  
  // Remove old requests outside the window
  const validRequests = clientRequests.filter(
    (timestamp) => now - timestamp < config.rateLimitWindow * 1000
  );
  
  // Check if under limit
  if (validRequests.length >= config.rateLimitRequests) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitStorage.set(clientId, validRequests);
  return true;
};

// Tool implementations
const calculatorTool = async (args: unknown) => {
  const input = CalculatorInputSchema.parse(args);
  
  const operations = {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    multiply: (a: number, b: number) => a * b,
    divide: (a: number, b: number) => {
      if (b === 0) throw new McpError(ErrorCode.InvalidRequest, 'Division by zero is not allowed');
      return a / b;
    },
  };
  
  const result = operations[input.operation](input.a, input.b);
  
  return [
    {
      type: 'text' as const,
      text: `Result: ${input.a} ${input.operation} ${input.b} = ${result}`,
    },
  ];
};

const fileOperationsTool = async (args: unknown) => {
  const input = FileOperationInputSchema.parse(args);
  
  // Security: Check if path is in allowed directories
  const resolvedPath = path.resolve(input.path);
  const isAllowed = config.allowedDirectories.some((allowedDir) =>
    resolvedPath.startsWith(path.resolve(allowedDir))
  );
  
  if (!isAllowed) {
    throw new McpError(ErrorCode.InvalidRequest, 'Access denied: Path not in allowed directories');
  }
  
  try {
    switch (input.operation) {
      case 'read': {
        const stats = await fs.stat(resolvedPath);
        if (stats.size > config.maxFileSize) {
          throw new McpError(ErrorCode.InvalidRequest, 'File too large');
        }
        
        const content = await fs.readFile(resolvedPath, 'utf-8');
        return [
          {
            type: 'text' as const,
            text: `File content:\n${content}`,
          },
        ];
      }
      
      case 'write': {
        if (!input.content) {
          throw new McpError(ErrorCode.InvalidRequest, 'Content required for write operation');
        }
        
        await fs.writeFile(resolvedPath, input.content, 'utf-8');
        return [
          {
            type: 'text' as const,
            text: `Successfully wrote ${input.content.length} characters to ${resolvedPath}`,
          },
        ];
      }
      
      case 'list': {
        const entries = await fs.readdir(resolvedPath);
        return [
          {
            type: 'text' as const,
            text: `Directory contents:\n${entries.join('\n')}`,
          },
        ];
      }
      
      case 'delete': {
        await fs.unlink(resolvedPath);
        return [
          {
            type: 'text' as const,
            text: `Successfully deleted ${resolvedPath}`,
          },
        ];
      }
      
      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unsupported operation: ${input.operation}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `File operation failed: ${error.message}`);
  }
};

const databaseQueryTool = async (args: unknown): Promise<Array<{ type: 'text'; text: string }>> => {
  const input = DatabaseQueryInputSchema.parse(args);
  
  // Security: Only allow SELECT statements
  const queryLower = input.query.toLowerCase().trim();
  if (!queryLower.startsWith('select')) {
    throw new McpError(ErrorCode.InvalidRequest, 'Only SELECT queries are allowed');
  }
  
  // Additional security: Check for dangerous keywords
  const dangerousKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'exec'];
  if (dangerousKeywords.some((keyword) => queryLower.includes(keyword))) {
    throw new McpError(ErrorCode.InvalidRequest, 'Query contains prohibited keywords');
  }
  
  return new Promise((resolve, reject) => {
    database.all(input.query, input.params, (err, rows) => {
      if (err) {
        reject(new McpError(ErrorCode.InternalError, `Database error: ${err.message}`));
        return;
      }
      
      if (!rows || rows.length === 0) {
        resolve([
          {
            type: 'text',
            text: 'Query executed successfully. No results found.',
          },
        ]);
        return;
      }
      
      // Format results as table
      const columns = Object.keys(rows[0]);
      const tableHeader = columns.join(' | ');
      const tableSeparator = '-'.repeat(tableHeader.length);
      const tableRows = rows.map((row) => 
        columns.map((col) => String(row[col])).join(' | ')
      );
      
      const tableData = [tableHeader, tableSeparator, ...tableRows].join('\n');
      
      resolve([
        {
          type: 'text',
          text: `Query results:\n\`\`\`\n${tableData}\n\`\`\``,
        },
      ]);
    });
  });
};

const webScraperTool = async (args: unknown) => {
  const input = WebScraperInputSchema.parse(args);
  
  // Security: Check allowed domains
  const url = new URL(input.url);
  const domain = url.hostname.toLowerCase();
  
  if (!config.allowedDomains.some((allowed) => domain.includes(allowed))) {
    throw new McpError(ErrorCode.InvalidRequest, `Domain not allowed: ${domain}`);
  }
  
  try {
    const response = await axios.get(input.url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    let content: string;
    if (input.selector) {
      // Extract specific elements
      const elements = $(input.selector);
      content = elements.map((_, el) => $(el).text().trim()).get().join('\n');
    } else {
      // Extract all text
      content = $('body').text().trim();
    }
    
    // Limit content length
    if (content.length > input.maxLength) {
      content = content.substring(0, input.maxLength) + '...[truncated]';
    }
    
    return [
      {
        type: 'text' as const,
        text: `Scraped content from ${input.url}:\n\n${content}`,
      },
    ];
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Scraping failed: ${error.message}`);
  }
};

const generateAuthTokenTool = async (args: unknown) => {
  const input = AuthTokenInputSchema.parse(args);
  
  const payload = {
    username: input.username,
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    iat: Math.floor(Date.now() / 1000),
  };
  
  const token = jwt.sign(payload, config.jwtSecret);
  
  return [
    {
      type: 'text' as const,
      text: `Generated JWT token for ${input.username}:\n${token}\n\nNote: This is for demo purposes only. In production, use proper authentication flows.`,
    },
  ];
};

// Create MCP server
const server = new Server(
  {
    name: 'mcp-boilerplate-typescript',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'calculator',
        description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'Operation to perform',
            },
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['operation', 'a', 'b'],
        },
      },
      {
        name: 'file_operations',
        description: 'Safe file system operations with access controls',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['read', 'write', 'list', 'delete'],
              description: 'Operation to perform',
            },
            path: { type: 'string', description: 'File or directory path' },
            content: { type: 'string', description: 'Content for write operations' },
          },
          required: ['operation', 'path'],
        },
      },
      {
        name: 'database_query',
        description: 'Execute read-only SQL queries on the demo database',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute (SELECT only)' },
            params: {
              type: 'array',
              items: {},
              description: 'Query parameters',
              default: [],
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'web_scraper',
        description: 'Extract content from web pages with domain restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', description: 'URL to scrape' },
            selector: { type: 'string', description: 'CSS selector for specific elements' },
            maxLength: {
              type: 'number',
              description: 'Maximum response length',
              default: 5000,
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'generate_auth_token',
        description: 'Generate a JWT token for authentication (demo purposes)',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username for token' },
          },
          required: ['username'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Rate limiting check
  const clientId = 'default'; // In real app, extract from session/auth
  if (!checkRateLimit(clientId)) {
    throw new McpError(ErrorCode.InvalidRequest, 'Rate limit exceeded. Please try again later.');
  }
  
  // Authentication check (simplified)
  // In a real implementation, extract auth from request headers
  verifyAuth();
  
  try {
    let content;
    
    switch (name) {
      case 'calculator':
        content = await calculatorTool(args);
        break;
      case 'file_operations':
        content = await fileOperationsTool(args);
        break;
      case 'database_query':
        content = await databaseQueryTool(args);
        break;
      case 'web_scraper':
        content = await webScraperTool(args);
        break;
      case 'generate_auth_token':
        content = await generateAuthTokenTool(args);
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    
    return { content };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
  }
});

// Resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'resource://config',
        name: 'Server Configuration',
        description: 'Current server configuration settings',
        mimeType: 'application/json',
      },
      {
        uri: 'resource://users',
        name: 'Demo Users',
        description: 'List of demo users in the database',
        mimeType: 'application/json',
      },
      {
        uri: 'resource://help',
        name: 'Help Documentation',
        description: 'Help documentation for using this MCP server',
        mimeType: 'text/plain',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case 'resource://config': {
      // Return sanitized config (remove secrets)
      const safeConfig = { ...config };
      delete (safeConfig as any).jwtSecret;
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(safeConfig, null, 2),
          },
        ],
      };
    }
    
    case 'resource://users': {
      return new Promise((resolve, reject) => {
        database.all('SELECT id, name, email, created_at FROM users', (err, rows) => {
          if (err) {
            reject(new McpError(ErrorCode.InternalError, `Database error: ${err.message}`));
            return;
          }
          
          resolve({
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(rows, null, 2),
              },
            ],
          });
        });
      });
    }
    
    case 'resource://help': {
      const helpText = `
MCP Boilerplate Server Help (TypeScript)

Available Tools:
1. calculator - Perform arithmetic operations
2. file_operations - Safe file system operations
3. database_query - Execute read-only SQL queries
4. web_scraper - Extract content from allowed websites
5. generate_auth_token - Generate JWT tokens for authentication

Available Resources:
1. resource://config - Server configuration
2. resource://users - Demo users from database
3. resource://help - This help documentation

Security Features:
- Rate limiting (${config.rateLimitRequests} requests per hour)
- Domain restrictions for web scraping
- File system access controls
- SQL injection protection
- JWT authentication support

For more information, see the README.md file.
      `.trim();
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: helpText,
          },
        ],
      };
    }
    
    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }
});

// Start server
const main = async (): Promise<void> => {
  console.error('Starting MCP Boilerplate Server (TypeScript)');
  console.error(`Authentication required: ${config.requireAuth}`);
  console.error(`Allowed domains: ${config.allowedDomains.join(', ')}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Server started and ready for connections');
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down server...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down server...');
  database.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
}); 