# MCP Boilerplate Examples

This document provides practical examples of how to use and extend the MCP boilerplate servers.

## Quick Start Examples

### 1. Basic Calculator Usage

Connect to any MCP server and test the calculator tool:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculator",
    "arguments": {
      "operation": "add",
      "a": 15,
      "b": 27
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Result: 15 add 27 = 42"
    }]
  }
}
```

### 2. File Operations

Safe file reading with access controls:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "file_operations",
    "arguments": {
      "operation": "write",
      "path": "/tmp/hello.txt",
      "content": "Hello from MCP!"
    }
  }
}
```

### 3. Database Queries

Execute read-only SQL queries:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "database_query",
    "arguments": {
      "query": "SELECT name, email FROM users WHERE name LIKE ?",
      "params": ["%John%"]
    }
  }
}
```

### 4. Web Scraping

Extract content from allowed domains:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "web_scraper",
    "arguments": {
      "url": "https://jsonplaceholder.typicode.com/posts/1",
      "selector": "title",
      "max_length": 1000
    }
  }
}
```

## Integration Examples

### With Claude Desktop

Add to your Claude Desktop configuration (`~/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-boilerplate-python": {
      "command": "python",
      "args": ["/path/to/python-server/server.py"],
      "env": {
        "REQUIRE_AUTH": "false"
      }
    },
    "mcp-boilerplate-typescript": {
      "command": "node",
      "args": ["/path/to/typescript-server/dist/server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### With LangChain

```python
import asyncio
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp.client.stdio import stdio_client, StdioServerParameters

async def setup_mcp_tools():
    # Connect to MCP server
    server_params = StdioServerParameters(
        command="python",
        args=["python-server/server.py"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Load all tools from the MCP server
            tools = await load_mcp_tools(session)
            
            # Use with LangChain agent
            from langchain.agents import initialize_agent
            from langchain.llms import OpenAI
            
            llm = OpenAI(temperature=0)
            agent = initialize_agent(
                tools, 
                llm, 
                agent="zero-shot-react-description",
                verbose=True
            )
            
            # Test the agent
            result = agent.run("Calculate 15 + 27 and then save the result to a file")
            print(result)

# Run the example
asyncio.run(setup_mcp_tools())
```

### With OpenAI Function Calling

```python
import openai
import json
import asyncio
from mcp.client.stdio import stdio_client, StdioServerParameters

class MCPToOpenAIBridge:
    def __init__(self, mcp_session):
        self.session = mcp_session
        self.tools = {}
    
    async def load_tools(self):
        """Load tools from MCP server and convert to OpenAI format"""
        response = await self.session.list_tools()
        
        openai_functions = []
        for tool in response.tools:
            function_def = {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
            openai_functions.append(function_def)
            self.tools[tool.name] = tool
        
        return openai_functions
    
    async def call_mcp_tool(self, name, arguments):
        """Call MCP tool and return result"""
        response = await self.session.call_tool(name, arguments)
        return response.content[0].text if response.content else ""

async def openai_with_mcp():
    # Setup MCP connection
    server_params = StdioServerParameters(
        command="python",
        args=["python-server/server.py"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            bridge = MCPToOpenAIBridge(session)
            functions = await bridge.load_tools()
            
            # Use with OpenAI
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "user", "content": "Calculate 25 * 4 and explain the result"}
                ],
                functions=functions,
                function_call="auto"
            )
            
            # Handle function calls
            if response.choices[0].message.get("function_call"):
                function_call = response.choices[0].message["function_call"]
                function_name = function_call["name"]
                function_args = json.loads(function_call["arguments"])
                
                # Call MCP tool
                result = await bridge.call_mcp_tool(function_name, function_args)
                
                # Send result back to OpenAI
                follow_up = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "user", "content": "Calculate 25 * 4 and explain the result"},
                        response.choices[0].message,
                        {
                            "role": "function",
                            "name": function_name,
                            "content": result
                        }
                    ]
                )
                
                print(follow_up.choices[0].message.content)

# Run the example
asyncio.run(openai_with_mcp())
```

## Custom Tool Development

### Adding a New Tool (Python)

1. **Define the input schema:**

```python
class WeatherInput(BaseModel):
    location: str = Field(..., description="City name or coordinates")
    units: str = Field(default="metric", description="Temperature units (metric/imperial)")
```

2. **Implement the tool function:**

```python
async def weather_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    input_data = WeatherInput(**arguments)
    
    # Implement weather API call
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": input_data.location,
                "units": input_data.units,
                "appid": os.getenv("WEATHER_API_KEY")
            }
        )
        data = response.json()
    
    return [types.TextContent(
        type="text",
        text=f"Weather in {input_data.location}: {data['main']['temp']}°"
    )]
```

3. **Register the tool:**

```python
# Add to handle_list_tools()
types.Tool(
    name="weather",
    description="Get current weather information for a location",
    inputSchema=WeatherInput.model_json_schema()
)

# Add to handle_call_tool()
elif name == "weather":
    return await weather_tool(arguments)
```

### Adding a New Resource (TypeScript)

```typescript
// Add to handle_list_resources()
{
  uri: 'resource://weather_data',
  name: 'Weather Data',
  description: 'Cached weather information',
  mimeType: 'application/json'
}

// Add to handle_read_resource()
case 'resource://weather_data': {
  const weatherData = await getWeatherCache();
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(weatherData, null, 2)
    }]
  };
}
```

## Security Examples

### Authentication Setup

**Environment variables:**
```bash
export REQUIRE_AUTH=true
export JWT_SECRET=your-super-secure-secret-key-here
```

**Generate a token:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_auth_token",
    "arguments": {
      "username": "developer"
    }
  }
}
```

**Use the token in subsequent requests:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "calculator",
    "arguments": {
      "operation": "add",
      "a": 1,
      "b": 2
    }
  },
  "auth": "Bearer <your-jwt-token>"
}
```

### Rate Limiting Configuration

```python
# Customize rate limits
CONFIG = {
    "rate_limit_requests": 1000,  # 1000 requests
    "rate_limit_window": 3600,    # per hour
}
```

### Domain Allowlisting

```typescript
// TypeScript server configuration
const config = {
  allowedDomains: [
    'mycompany.com',
    'api.trusted-service.com',
    'httpbin.org'  // For testing
  ]
};
```

## Production Deployment Examples

### Docker Compose with SSL

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mcp-server:
    build: ./python-server
    environment:
      - REQUIRE_AUTH=true
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_DOMAINS=${ALLOWED_DOMAINS}
    volumes:
      - ./ssl:/ssl:ro
    networks:
      - mcp-network

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: your-registry/mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: REQUIRE_AUTH
          value: "true"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

## Testing Examples

### Unit Testing (Python)

```python
import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_calculator_with_mock():
    """Test calculator tool with mocked dependencies"""
    
    with patch('server.check_rate_limit', return_value=True):
        with patch('server.verifyAuth', return_value=True):
            result = await calculator_tool({
                "operation": "multiply",
                "a": 6,
                "b": 7
            })
            
            assert len(result) == 1
            assert "42" in result[0]["text"]

@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiting functionality"""
    
    # Simulate multiple requests
    for i in range(101):  # Exceed default limit
        success = check_rate_limit("test_client")
        if i < 100:
            assert success
        else:
            assert not success
```

### Integration Testing

```python
import asyncio
from mcp.client.stdio import stdio_client, StdioServerParameters

async def test_full_integration():
    """Test full MCP server integration"""
    
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"],
        env={"REQUIRE_AUTH": "false"}
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Test tool listing
            tools_response = await session.list_tools()
            assert len(tools_response.tools) > 0
            
            # Test tool calling
            result = await session.call_tool("calculator", {
                "operation": "add",
                "a": 5,
                "b": 3
            })
            assert result.content[0].text == "Result: 5 add 3 = 8"
            
            # Test resource reading
            resources = await session.list_resources()
            assert len(resources.resources) > 0
            
            config = await session.read_resource("resource://config")
            assert config.contents[0].mimeType == "application/json"
```

## Error Handling Examples

### Graceful Error Responses

```python
async def robust_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    try:
        # Tool implementation
        result = await some_operation(arguments)
        return [types.TextContent(type="text", text=result)]
    
    except ValidationError as e:
        raise McpError(
            ErrorCode.InvalidRequest,
            f"Invalid input: {str(e)}"
        )
    except TimeoutError:
        raise McpError(
            ErrorCode.InternalError,
            "Operation timed out. Please try again."
        )
    except Exception as e:
        logger.error(f"Unexpected error in robust_tool: {str(e)}")
        raise McpError(
            ErrorCode.InternalError,
            "An unexpected error occurred. Please contact support."
        )
```

### Client-Side Error Handling

```python
async def safe_mcp_call(session, tool_name, arguments):
    """Safely call MCP tool with error handling"""
    
    try:
        result = await session.call_tool(tool_name, arguments)
        return result.content[0].text if result.content else ""
    
    except McpError as e:
        if e.code == ErrorCode.InvalidRequest:
            return f"Invalid request: {e.message}"
        elif e.code == ErrorCode.MethodNotFound:
            return f"Tool '{tool_name}' not found"
        else:
            return f"Server error: {e.message}"
    
    except Exception as e:
        return f"Connection error: {str(e)}"
```

## Performance Optimization Examples

### Caching Implementation

```python
from functools import lru_cache
import asyncio

# In-memory cache
_cache = {}
_cache_ttl = {}

async def cached_web_scraper(url: str, ttl: int = 300):
    """Web scraper with caching"""
    
    now = asyncio.get_event_loop().time()
    
    # Check cache
    if url in _cache and now - _cache_ttl.get(url, 0) < ttl:
        return _cache[url]
    
    # Fetch and cache
    result = await fetch_url_content(url)
    _cache[url] = result
    _cache_ttl[url] = now
    
    return result
```

### Streaming Large Results

```python
async def stream_large_file(file_path: str):
    """Stream large file contents"""
    
    chunk_size = 8192
    
    try:
        with open(file_path, 'r') as file:
            while True:
                chunk = file.read(chunk_size)
                if not chunk:
                    break
                
                yield types.TextContent(
                    type="text",
                    text=chunk
                )
    
    except IOError as e:
        yield types.TextContent(
            type="text",
            text=f"Error reading file: {str(e)}"
        )
```

This examples guide demonstrates the flexibility and power of the MCP boilerplate. You can adapt these patterns to build sophisticated AI tools that integrate seamlessly with various AI platforms and use cases. 