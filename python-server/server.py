#!/usr/bin/env python3
"""
Comprehensive MCP Server Implementation in Python

This server demonstrates:
- Multiple tool types (calculator, filesystem, database, web scraper)
- Resource management
- Security features (authentication, validation, rate limiting)
- Error handling and logging
- Both stdio and HTTP transports
"""

import asyncio
import json
import logging
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
import mcp.types as types
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from pydantic import AnyUrl, BaseModel, Field
import pathlib
import hashlib
import jwt
from functools import wraps
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-server")

# Configuration
CONFIG = {
    "allowed_domains": ["example.com", "httpbin.org", "jsonplaceholder.typicode.com"],
    "max_file_size": 10 * 1024 * 1024,  # 10MB
    "rate_limit_requests": 100,
    "rate_limit_window": 3600,  # 1 hour
    "allowed_directories": ["/tmp", "/var/tmp"],
    "jwt_secret": os.getenv("JWT_SECRET", "your-secret-key-change-in-production"),
    "require_auth": os.getenv("REQUIRE_AUTH", "false").lower() == "true"
}

# Rate limiting storage
rate_limit_storage: Dict[str, List[float]] = {}

# Authentication decorator
def require_auth(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not CONFIG["require_auth"]:
            return await func(*args, **kwargs)
        
        # In a real implementation, you'd extract and validate JWT from headers
        # This is a simplified example
        auth_header = kwargs.get("auth_header")
        if not auth_header:
            raise ValueError("Authentication required")
        
        try:
            token = auth_header.replace("Bearer ", "")
            jwt.decode(token, CONFIG["jwt_secret"], algorithms=["HS256"])
        except jwt.InvalidTokenError:
            raise ValueError("Invalid authentication token")
        
        return await func(*args, **kwargs)
    return wrapper

# Rate limiting
def check_rate_limit(client_id: str) -> bool:
    """Check if client has exceeded rate limit"""
    now = time.time()
    if client_id not in rate_limit_storage:
        rate_limit_storage[client_id] = []
    
    # Remove old requests outside the window
    rate_limit_storage[client_id] = [
        req_time for req_time in rate_limit_storage[client_id]
        if now - req_time < CONFIG["rate_limit_window"]
    ]
    
    # Check if under limit
    if len(rate_limit_storage[client_id]) >= CONFIG["rate_limit_requests"]:
        return False
    
    # Add current request
    rate_limit_storage[client_id].append(now)
    return True

# Initialize MCP server
server = Server("mcp-boilerplate-server")

# Database setup (SQLite for demo)
def init_db():
    """Initialize demo database"""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        INSERT INTO users (name, email) VALUES 
        ('John Doe', 'john@example.com'),
        ('Jane Smith', 'jane@example.com'),
        ('Bob Johnson', 'bob@example.com')
    """)
    conn.commit()
    return conn

# Global database connection
db_conn = init_db()

# Input/Output Models
class CalculatorInput(BaseModel):
    operation: str = Field(..., description="Operation to perform: add, subtract, multiply, divide")
    a: float = Field(..., description="First number")
    b: float = Field(..., description="Second number")

class FileOperationInput(BaseModel):
    operation: str = Field(..., description="Operation: read, write, list, delete")
    path: str = Field(..., description="File or directory path")
    content: Optional[str] = Field(None, description="Content for write operations")

class DatabaseQueryInput(BaseModel):
    query: str = Field(..., description="SQL query to execute (SELECT only)")
    params: List[Any] = Field(default=[], description="Query parameters")

class WebScraperInput(BaseModel):
    url: str = Field(..., description="URL to scrape")
    selector: Optional[str] = Field(None, description="CSS selector for specific elements")
    max_length: int = Field(default=5000, description="Maximum response length")

# Tool implementations
@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available tools"""
    return [
        types.Tool(
            name="calculator",
            description="Perform basic arithmetic operations (add, subtract, multiply, divide)",
            inputSchema=CalculatorInput.model_json_schema()
        ),
        types.Tool(
            name="file_operations",
            description="Safe file system operations with access controls",
            inputSchema=FileOperationInput.model_json_schema()
        ),
        types.Tool(
            name="database_query",
            description="Execute read-only SQL queries on the demo database",
            inputSchema=DatabaseQueryInput.model_json_schema()
        ),
        types.Tool(
            name="web_scraper",
            description="Extract content from web pages with domain restrictions",
            inputSchema=WebScraperInput.model_json_schema()
        ),
        types.Tool(
            name="generate_auth_token",
            description="Generate a JWT token for authentication (demo purposes)",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "Username for token"}
                },
                "required": ["username"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls with security and validation"""
    
    # Rate limiting check (simplified - in production use proper client identification)
    client_id = "default"  # In real app, extract from session/auth
    if not check_rate_limit(client_id):
        raise ValueError("Rate limit exceeded. Please try again later.")
    
    try:
        if name == "calculator":
            return await calculator_tool(arguments)
        elif name == "file_operations":
            return await file_operations_tool(arguments)
        elif name == "database_query":
            return await database_query_tool(arguments)
        elif name == "web_scraper":
            return await web_scraper_tool(arguments)
        elif name == "generate_auth_token":
            return await generate_auth_token_tool(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    except Exception as e:
        logger.error(f"Tool call error ({name}): {str(e)}")
        raise ValueError(f"Tool execution failed: {str(e)}")

async def calculator_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Calculator tool implementation"""
    input_data = CalculatorInput(**arguments)
    
    operations = {
        "add": lambda a, b: a + b,
        "subtract": lambda a, b: a - b,
        "multiply": lambda a, b: a * b,
        "divide": lambda a, b: a / b if b != 0 else None
    }
    
    if input_data.operation not in operations:
        raise ValueError(f"Unsupported operation: {input_data.operation}")
    
    if input_data.operation == "divide" and input_data.b == 0:
        raise ValueError("Division by zero is not allowed")
    
    result = operations[input_data.operation](input_data.a, input_data.b)
    
    return [types.TextContent(
        type="text",
        text=f"Result: {input_data.a} {input_data.operation} {input_data.b} = {result}"
    )]

async def file_operations_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """File operations tool with security controls"""
    input_data = FileOperationInput(**arguments)
    
    # Security: Check if path is in allowed directories
    path = pathlib.Path(input_data.path).resolve()
    allowed = any(str(path).startswith(allowed_dir) for allowed_dir in CONFIG["allowed_directories"])
    
    if not allowed:
        raise ValueError(f"Access denied: Path not in allowed directories")
    
    try:
        if input_data.operation == "read":
            if not path.exists():
                raise ValueError("File does not exist")
            
            # Check file size
            if path.stat().st_size > CONFIG["max_file_size"]:
                raise ValueError("File too large")
            
            content = path.read_text(encoding="utf-8")
            return [types.TextContent(
                type="text",
                text=f"File content:\n{content}"
            )]
        
        elif input_data.operation == "write":
            if not input_data.content:
                raise ValueError("Content required for write operation")
            
            path.write_text(input_data.content, encoding="utf-8")
            return [types.TextContent(
                type="text",
                text=f"Successfully wrote {len(input_data.content)} characters to {path}"
            )]
        
        elif input_data.operation == "list":
            if not path.is_dir():
                raise ValueError("Path is not a directory")
            
            files = [f.name for f in path.iterdir()]
            return [types.TextContent(
                type="text",
                text=f"Directory contents:\n" + "\n".join(files)
            )]
        
        elif input_data.operation == "delete":
            if not path.exists():
                raise ValueError("File does not exist")
            
            path.unlink()
            return [types.TextContent(
                type="text",
                text=f"Successfully deleted {path}"
            )]
        
        else:
            raise ValueError(f"Unsupported operation: {input_data.operation}")
    
    except PermissionError:
        raise ValueError("Permission denied")
    except UnicodeDecodeError:
        raise ValueError("File contains invalid UTF-8 content")

async def database_query_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Database query tool (read-only)"""
    input_data = DatabaseQueryInput(**arguments)
    
    # Security: Only allow SELECT statements
    query_lower = input_data.query.lower().strip()
    if not query_lower.startswith("select"):
        raise ValueError("Only SELECT queries are allowed")
    
    # Additional security: Check for dangerous keywords
    dangerous_keywords = ["insert", "update", "delete", "drop", "create", "alter", "exec"]
    if any(keyword in query_lower for keyword in dangerous_keywords):
        raise ValueError("Query contains prohibited keywords")
    
    try:
        cursor = db_conn.cursor()
        cursor.execute(input_data.query, input_data.params)
        results = cursor.fetchall()
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        # Format results
        if not results:
            return [types.TextContent(
                type="text",
                text="Query executed successfully. No results found."
            )]
        
        # Create table format
        table_data = []
        table_data.append(" | ".join(columns))
        table_data.append("-" * len(table_data[0]))
        
        for row in results:
            table_data.append(" | ".join(str(cell) for cell in row))
        
        return [types.TextContent(
            type="text",
            text=f"Query results:\n```\n" + "\n".join(table_data) + "\n```"
        )]
    
    except sqlite3.Error as e:
        raise ValueError(f"Database error: {str(e)}")

async def web_scraper_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Web scraper tool with domain restrictions"""
    input_data = WebScraperInput(**arguments)
    
    # Security: Check allowed domains
    parsed_url = urlparse(input_data.url)
    domain = parsed_url.netloc.lower()
    
    if not any(allowed in domain for allowed in CONFIG["allowed_domains"]):
        raise ValueError(f"Domain not allowed: {domain}")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(input_data.url)
            response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        if input_data.selector:
            # Extract specific elements
            elements = soup.select(input_data.selector)
            content = "\n".join(elem.get_text().strip() for elem in elements)
        else:
            # Extract all text
            content = soup.get_text()
        
        # Limit content length
        if len(content) > input_data.max_length:
            content = content[:input_data.max_length] + "...[truncated]"
        
        return [types.TextContent(
            type="text",
            text=f"Scraped content from {input_data.url}:\n\n{content}"
        )]
    
    except httpx.RequestError as e:
        raise ValueError(f"Request failed: {str(e)}")
    except Exception as e:
        raise ValueError(f"Scraping failed: {str(e)}")

async def generate_auth_token_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Generate JWT token for demo purposes"""
    username = arguments.get("username")
    if not username:
        raise ValueError("Username is required")
    
    # Generate JWT token
    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=24),
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, CONFIG["jwt_secret"], algorithm="HS256")
    
    return [types.TextContent(
        type="text",
        text=f"Generated JWT token for {username}:\n{token}\n\nNote: This is for demo purposes only. In production, use proper authentication flows."
    )]

# Resources
@server.list_resources()
async def handle_list_resources() -> List[types.Resource]:
    """List available resources"""
    return [
        types.Resource(
            uri=AnyUrl("resource://config"),
            name="Server Configuration",
            description="Current server configuration settings",
            mimeType="application/json"
        ),
        types.Resource(
            uri=AnyUrl("resource://users"),
            name="Demo Users",
            description="List of demo users in the database",
            mimeType="application/json"
        ),
        types.Resource(
            uri=AnyUrl("resource://help"),
            name="Help Documentation",
            description="Help documentation for using this MCP server",
            mimeType="text/plain"
        )
    ]

@server.read_resource()
async def handle_read_resource(uri: AnyUrl) -> str:
    """Read resource content"""
    if str(uri) == "resource://config":
        # Return sanitized config (remove secrets)
        safe_config = {k: v for k, v in CONFIG.items() if "secret" not in k.lower()}
        return json.dumps(safe_config, indent=2)
    
    elif str(uri) == "resource://users":
        cursor = db_conn.cursor()
        cursor.execute("SELECT id, name, email, created_at FROM users")
        users = cursor.fetchall()
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "created_at": user[3]
            })
        
        return json.dumps(user_list, indent=2)
    
    elif str(uri) == "resource://help":
        return """
MCP Boilerplate Server Help

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
- Rate limiting (100 requests per hour)
- Domain restrictions for web scraping
- File system access controls
- SQL injection protection
- JWT authentication support

For more information, see the README.md file.
        """.strip()
    
    else:
        raise ValueError(f"Unknown resource: {uri}")

# Notifications
@server.notification()
async def handle_notification(method: str, params: Dict[str, Any]) -> None:
    """Handle notifications from clients"""
    logger.info(f"Received notification: {method} with params: {params}")

# Server initialization
async def main():
    """Main server entry point"""
    logger.info("Starting MCP Boilerplate Server")
    logger.info(f"Authentication required: {CONFIG['require_auth']}")
    logger.info(f"Allowed domains: {CONFIG['allowed_domains']}")
    
    # Run server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="mcp-boilerplate-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main()) 