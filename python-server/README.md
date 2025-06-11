# Python MCP Server

A comprehensive Model Context Protocol (MCP) server implementation in Python demonstrating best practices for building secure, extensible AI tools.

## Features

### 🛠️ Tools
- **Calculator** - Basic arithmetic operations with validation
- **File Operations** - Secure file system access with directory restrictions
- **Database Query** - Read-only SQL execution with injection protection
- **Web Scraper** - Domain-restricted web content extraction
- **Auth Token Generator** - JWT token generation for authentication demos

### 📚 Resources
- **Server Configuration** - Current server settings (sanitized)
- **Demo Users** - User data from the demo database
- **Help Documentation** - Usage instructions and API reference

### 🔒 Security Features
- JWT authentication support
- Rate limiting (configurable)
- Input validation with Pydantic models
- SQL injection protection
- File system access controls
- Domain allowlisting for web scraping
- Comprehensive error handling

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd python-server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Set environment variables to configure the server:

```bash
# Optional: Enable authentication
export REQUIRE_AUTH=true

# Optional: Set JWT secret (required if auth is enabled)
export JWT_SECRET=your-super-secure-secret-key

# Optional: Configure allowed directories for file operations
# (defaults to /tmp and /var/tmp)
```

## Usage

### Running the Server

```bash
# Start the server with stdio transport
python server.py

# The server will output JSON-RPC messages to stdout
# and read from stdin for communication with MCP clients
```

### Testing with MCP Inspector

```bash
# Install MCP Inspector (if available)
npm install -g @modelcontextprotocol/inspector

# Run the inspector with your server
mcp-inspector python server.py
```

### Example Tool Calls

#### Calculator Tool
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

#### File Operations Tool
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "file_operations",
    "arguments": {
      "operation": "read",
      "path": "/tmp/example.txt"
    }
  }
}
```

#### Database Query Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "database_query",
    "arguments": {
      "query": "SELECT * FROM users WHERE name LIKE ?",
      "params": ["%John%"]
    }
  }
}
```

#### Web Scraper Tool
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

## Security Considerations

### Authentication
When `REQUIRE_AUTH=true`, all tool calls require a valid JWT token. Generate one using:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "generate_auth_token",
    "arguments": {
      "username": "demo_user"
    }
  }
}
```

### File System Security
- Only allows access to configured directories (default: `/tmp`, `/var/tmp`)
- Enforces file size limits (default: 10MB)
- Validates file paths to prevent directory traversal

### Database Security
- Only `SELECT` statements allowed
- SQL injection protection through parameterized queries
- Dangerous keywords blocked

### Web Scraping Security
- Domain allowlisting (configurable)
- Request timeouts to prevent hanging
- Content length limits

### Rate Limiting
- Default: 100 requests per hour per client
- Configurable window and limits
- Tracks requests in memory (use Redis for production)

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=server

# Run specific test file
pytest tests/test_calculator.py
```

### Code Quality
```bash
# Format code
black server.py

# Lint code
flake8 server.py

# Type checking
mypy server.py
```

### Adding New Tools

1. Create input/output models using Pydantic:
```python
class MyToolInput(BaseModel):
    param1: str = Field(..., description="Description of param1")
    param2: int = Field(default=0, description="Description of param2")
```

2. Add tool to the list in `handle_list_tools()`:
```python
types.Tool(
    name="my_tool",
    description="Description of what the tool does",
    inputSchema=MyToolInput.model_json_schema()
)
```

3. Implement the tool function:
```python
async def my_tool(arguments: Dict[str, Any]) -> List[types.TextContent]:
    input_data = MyToolInput(**arguments)
    # Tool implementation here
    return [types.TextContent(type="text", text="Result")]
```

4. Add the tool to the call handler in `handle_call_tool()`.

### Adding New Resources

1. Add resource to `handle_list_resources()`:
```python
types.Resource(
    uri=AnyUrl("resource://my_resource"),
    name="My Resource",
    description="Description of the resource",
    mimeType="application/json"
)
```

2. Handle the resource in `handle_read_resource()`:
```python
elif str(uri) == "resource://my_resource":
    # Generate and return resource content
    return json.dumps({"data": "value"})
```

## Production Deployment

### Environment Variables
```bash
REQUIRE_AUTH=true
JWT_SECRET=<strong-random-secret>
ALLOWED_DOMAINS=yourdomain.com,api.example.com
MAX_FILE_SIZE=52428800  # 50MB
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

### Using with Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server.py .
CMD ["python", "server.py"]
```

### Monitoring
- Enable structured logging for production
- Monitor rate limit violations
- Track tool usage metrics
- Set up health checks

## Integration Examples

### With LangChain
```python
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(command="python server.py")
async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        tools = await load_mcp_tools(session)
        # Use tools with LangChain agents
```

### With Claude Desktop
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "python-boilerplate": {
      "command": "python",
      "args": ["path/to/server.py"]
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Permission Denied**: Check file system permissions for allowed directories
3. **Rate Limit Exceeded**: Increase limits or implement proper client identification
4. **Authentication Failed**: Verify JWT secret and token format

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python server.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure code passes all checks (`black`, `flake8`, `mypy`, `pytest`)
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 