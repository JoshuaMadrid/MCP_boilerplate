import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockServer = {
  setRequestHandler: jest.fn(),
};

const mockStdioServerTransport = {
  start: jest.fn(),
};

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(() => mockServer),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => mockStdioServerTransport),
}));

// Import the tool function
// Note: In a real implementation, you'd extract the calculator logic into a separate module
const calculatorTool = async (args: unknown) => {
  const z = await import('zod');
  
  const CalculatorInputSchema = z.z.object({
    operation: z.z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.z.number(),
    b: z.z.number(),
  });

  const input = CalculatorInputSchema.parse(args);
  
  const operations = {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    multiply: (a: number, b: number) => a * b,
    divide: (a: number, b: number) => {
      if (b === 0) throw new Error('Division by zero is not allowed');
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

describe('Calculator Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Addition', () => {
    it('should add two positive numbers correctly', async () => {
      const result = await calculatorTool({
        operation: 'add',
        a: 5,
        b: 3,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].text).toContain('5 add 3 = 8');
    });

    it('should handle negative numbers', async () => {
      const result = await calculatorTool({
        operation: 'add',
        a: -5,
        b: 3,
      });

      expect(result[0].text).toContain('-5 add 3 = -2');
    });

    it('should handle decimal numbers', async () => {
      const result = await calculatorTool({
        operation: 'add',
        a: 1.5,
        b: 2.3,
      });

      expect(result[0].text).toContain('1.5 add 2.3 = 3.8');
    });
  });

  describe('Subtraction', () => {
    it('should subtract numbers correctly', async () => {
      const result = await calculatorTool({
        operation: 'subtract',
        a: 10,
        b: 4,
      });

      expect(result[0].text).toContain('10 subtract 4 = 6');
    });
  });

  describe('Multiplication', () => {
    it('should multiply numbers correctly', async () => {
      const result = await calculatorTool({
        operation: 'multiply',
        a: 6,
        b: 7,
      });

      expect(result[0].text).toContain('6 multiply 7 = 42');
    });

    it('should handle multiplication by zero', async () => {
      const result = await calculatorTool({
        operation: 'multiply',
        a: 5,
        b: 0,
      });

      expect(result[0].text).toContain('5 multiply 0 = 0');
    });
  });

  describe('Division', () => {
    it('should divide numbers correctly', async () => {
      const result = await calculatorTool({
        operation: 'divide',
        a: 15,
        b: 3,
      });

      expect(result[0].text).toContain('15 divide 3 = 5');
    });

    it('should handle decimal division', async () => {
      const result = await calculatorTool({
        operation: 'divide',
        a: 7,
        b: 2,
      });

      expect(result[0].text).toContain('7 divide 2 = 3.5');
    });

    it('should throw error for division by zero', async () => {
      await expect(
        calculatorTool({
          operation: 'divide',
          a: 5,
          b: 0,
        })
      ).rejects.toThrow('Division by zero is not allowed');
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid operation', async () => {
      await expect(
        calculatorTool({
          operation: 'power',
          a: 2,
          b: 3,
        })
      ).rejects.toThrow();
    });

    it('should throw error for missing parameters', async () => {
      await expect(
        calculatorTool({
          operation: 'add',
          a: 5,
        })
      ).rejects.toThrow();
    });

    it('should throw error for non-numeric parameters', async () => {
      await expect(
        calculatorTool({
          operation: 'add',
          a: 'five',
          b: 3,
        })
      ).rejects.toThrow();
    });
  });
}); 