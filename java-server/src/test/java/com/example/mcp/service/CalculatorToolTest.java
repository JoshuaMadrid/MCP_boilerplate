package com.example.mcp.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Calculator Tool Tests")
class CalculatorToolTest {
    
    private CalculatorTool calculatorTool;
    
    @BeforeEach
    void setUp() {
        calculatorTool = new CalculatorTool();
    }
    
    @Nested
    @DisplayName("Addition Operations")
    class AdditionTests {
        
        @Test
        @DisplayName("Should add two positive numbers correctly")
        void testAddPositiveNumbers() {
            Map<String, Object> arguments = Map.of(
                "operation", "add",
                "a", 5.0,
                "b", 3.0
            );
            
            Object result = calculatorTool.execute(arguments);
            
            assertNotNull(result);
            assertTrue(result instanceof List);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            assertEquals(1, content.size());
            assertEquals("text", content.get(0).get("type"));
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("5.00 add 3.00 = 8.00"));
        }
        
        @Test
        @DisplayName("Should handle negative numbers")
        void testAddNegativeNumbers() {
            Map<String, Object> arguments = Map.of(
                "operation", "add",
                "a", -5.0,
                "b", 3.0
            );
            
            Object result = calculatorTool.execute(arguments);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("-5.00 add 3.00 = -2.00"));
        }
    }
    
    @Nested
    @DisplayName("Subtraction Operations")
    class SubtractionTests {
        
        @Test
        @DisplayName("Should subtract numbers correctly")
        void testSubtraction() {
            Map<String, Object> arguments = Map.of(
                "operation", "subtract",
                "a", 10.0,
                "b", 4.0
            );
            
            Object result = calculatorTool.execute(arguments);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("10.00 subtract 4.00 = 6.00"));
        }
    }
    
    @Nested
    @DisplayName("Multiplication Operations")
    class MultiplicationTests {
        
        @Test
        @DisplayName("Should multiply numbers correctly")
        void testMultiplication() {
            Map<String, Object> arguments = Map.of(
                "operation", "multiply",
                "a", 6.0,
                "b", 7.0
            );
            
            Object result = calculatorTool.execute(arguments);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("6.00 multiply 7.00 = 42.00"));
        }
        
        @Test
        @DisplayName("Should handle multiplication by zero")
        void testMultiplicationByZero() {
            Map<String, Object> arguments = Map.of(
                "operation", "multiply",
                "a", 5.0,
                "b", 0.0
            );
            
            Object result = calculatorTool.execute(arguments);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("5.00 multiply 0.00 = 0.00"));
        }
    }
    
    @Nested
    @DisplayName("Division Operations")
    class DivisionTests {
        
        @Test
        @DisplayName("Should divide numbers correctly")
        void testDivision() {
            Map<String, Object> arguments = Map.of(
                "operation", "divide",
                "a", 15.0,
                "b", 3.0
            );
            
            Object result = calculatorTool.execute(arguments);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) result;
            
            String text = (String) content.get(0).get("text");
            assertTrue(text.contains("15.00 divide 3.00 = 5.00"));
        }
        
        @Test
        @DisplayName("Should throw exception for division by zero")
        void testDivisionByZero() {
            Map<String, Object> arguments = Map.of(
                "operation", "divide",
                "a", 5.0,
                "b", 0.0
            );
            
            IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> calculatorTool.execute(arguments)
            );
            
            assertEquals("Division by zero is not allowed", exception.getMessage());
        }
    }
    
    @Nested
    @DisplayName("Input Validation")
    class ValidationTests {
        
        @Test
        @DisplayName("Should throw exception for invalid operation")
        void testInvalidOperation() {
            Map<String, Object> arguments = Map.of(
                "operation", "power",
                "a", 2.0,
                "b", 3.0
            );
            
            IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> calculatorTool.execute(arguments)
            );
            
            assertTrue(exception.getMessage().contains("Unsupported operation"));
        }
        
        @Test
        @DisplayName("Should throw exception for missing parameters")
        void testMissingParameters() {
            Map<String, Object> arguments = Map.of(
                "operation", "add",
                "a", 5.0
                // missing 'b' parameter
            );
            
            assertThrows(
                IllegalArgumentException.class,
                () -> calculatorTool.execute(arguments)
            );
        }
        
        @Test
        @DisplayName("Should throw exception for null operation")
        void testNullOperation() {
            Map<String, Object> arguments = Map.of(
                "a", 5.0,
                "b", 3.0
                // missing 'operation' parameter
            );
            
            assertThrows(
                IllegalArgumentException.class,
                () -> calculatorTool.execute(arguments)
            );
        }
    }
} 