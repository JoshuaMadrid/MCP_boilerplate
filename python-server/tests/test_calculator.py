"""
Tests for the calculator tool in the MCP server
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
import sys
import os

# Add the parent directory to sys.path to import server module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import calculatorTool, CalculatorInput
from mcp.server import McpError
import mcp.types as types


class TestCalculatorTool:
    """Test cases for the calculator tool"""
    
    @pytest.mark.asyncio
    async def test_addition(self):
        """Test addition operation"""
        args = {"operation": "add", "a": 5, "b": 3}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert isinstance(result[0], dict)
        assert result[0]["type"] == "text"
        assert "Result: 5 add 3 = 8" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_subtraction(self):
        """Test subtraction operation"""
        args = {"operation": "subtract", "a": 10, "b": 4}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert result[0]["type"] == "text"
        assert "Result: 10 subtract 4 = 6" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_multiplication(self):
        """Test multiplication operation"""
        args = {"operation": "multiply", "a": 6, "b": 7}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert result[0]["type"] == "text"
        assert "Result: 6 multiply 7 = 42" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_division(self):
        """Test division operation"""
        args = {"operation": "divide", "a": 15, "b": 3}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert result[0]["type"] == "text"
        assert "Result: 15 divide 3 = 5" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_division_with_decimals(self):
        """Test division operation with decimal result"""
        args = {"operation": "divide", "a": 10, "b": 3}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert result[0]["type"] == "text"
        assert "3.3333" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_division_by_zero(self):
        """Test division by zero raises appropriate error"""
        args = {"operation": "divide", "a": 10, "b": 0}
        
        with pytest.raises(McpError) as exc_info:
            await calculatorTool(args)
        
        assert "Division by zero is not allowed" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_invalid_operation(self):
        """Test invalid operation raises validation error"""
        args = {"operation": "power", "a": 2, "b": 3}
        
        with pytest.raises(Exception):  # Pydantic validation error
            await calculatorTool(args)
    
    @pytest.mark.asyncio
    async def test_missing_parameters(self):
        """Test missing parameters raise validation error"""
        args = {"operation": "add", "a": 5}  # Missing 'b'
        
        with pytest.raises(Exception):  # Pydantic validation error
            await calculatorTool(args)
    
    @pytest.mark.asyncio
    async def test_invalid_parameter_types(self):
        """Test invalid parameter types raise validation error"""
        args = {"operation": "add", "a": "five", "b": 3}
        
        with pytest.raises(Exception):  # Pydantic validation error
            await calculatorTool(args)
    
    @pytest.mark.asyncio
    async def test_negative_numbers(self):
        """Test operations with negative numbers"""
        args = {"operation": "add", "a": -5, "b": 3}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert "Result: -5 add 3 = -2" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_floating_point_numbers(self):
        """Test operations with floating point numbers"""
        args = {"operation": "multiply", "a": 2.5, "b": 4.0}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert "Result: 2.5 multiply 4.0 = 10.0" in result[0]["text"]
    
    @pytest.mark.asyncio
    async def test_large_numbers(self):
        """Test operations with large numbers"""
        args = {"operation": "add", "a": 1000000, "b": 2000000}
        result = await calculatorTool(args)
        
        assert len(result) == 1
        assert "Result: 1000000 add 2000000 = 3000000" in result[0]["text"]


class TestCalculatorInput:
    """Test cases for CalculatorInput validation"""
    
    def test_valid_input(self):
        """Test valid input creates CalculatorInput instance"""
        data = {"operation": "add", "a": 5, "b": 3}
        calc_input = CalculatorInput(**data)
        
        assert calc_input.operation == "add"
        assert calc_input.a == 5
        assert calc_input.b == 3
    
    def test_invalid_operation(self):
        """Test invalid operation raises validation error"""
        data = {"operation": "modulo", "a": 5, "b": 3}
        
        with pytest.raises(Exception):  # Pydantic validation error
            CalculatorInput(**data)
    
    def test_string_numbers_conversion(self):
        """Test that string numbers are converted to float"""
        data = {"operation": "add", "a": "5", "b": "3"}
        calc_input = CalculatorInput(**data)
        
        assert calc_input.a == 5.0
        assert calc_input.b == 3.0
    
    def test_invalid_number_string(self):
        """Test invalid number string raises validation error"""
        data = {"operation": "add", "a": "not_a_number", "b": 3}
        
        with pytest.raises(Exception):  # Pydantic validation error
            CalculatorInput(**data)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"]) 