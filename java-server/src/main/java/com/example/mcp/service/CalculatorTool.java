package com.example.mcp.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Calculator tool implementation
 */
@Component
public class CalculatorTool {
    
    public Object execute(Map<String, Object> arguments) {
        String operation = (String) arguments.get("operation");
        Number aNum = (Number) arguments.get("a");
        Number bNum = (Number) arguments.get("b");
        
        if (operation == null || aNum == null || bNum == null) {
            throw new IllegalArgumentException("Missing required parameters: operation, a, b");
        }
        
        double a = aNum.doubleValue();
        double b = bNum.doubleValue();
        double result;
        
        switch (operation) {
            case "add" -> result = a + b;
            case "subtract" -> result = a - b;
            case "multiply" -> result = a * b;
            case "divide" -> {
                if (b == 0) {
                    throw new IllegalArgumentException("Division by zero is not allowed");
                }
                result = a / b;
            }
            default -> throw new IllegalArgumentException("Unsupported operation: " + operation);
        }
        
        return List.of(Map.of(
            "type", "text",
            "text", String.format("Result: %.2f %s %.2f = %.2f", a, operation, b, result)
        ));
    }
}

@Component
class FileOperationsTool {
    public Object execute(Map<String, Object> arguments) {
        return List.of(Map.of(
            "type", "text",
            "text", "File operations not implemented in Java demo"
        ));
    }
}

@Component
class DatabaseTool {
    public Object execute(Map<String, Object> arguments) {
        return List.of(Map.of(
            "type", "text",
            "text", "Database operations not implemented in Java demo"
        ));
    }
}

@Component
class WebScraperTool {
    public Object execute(Map<String, Object> arguments) {
        return List.of(Map.of(
            "type", "text",
            "text", "Web scraper not implemented in Java demo"
        ));
    }
} 