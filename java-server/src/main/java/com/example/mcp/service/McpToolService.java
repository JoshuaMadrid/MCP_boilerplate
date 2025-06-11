package com.example.mcp.service;

import com.example.mcp.config.McpConfiguration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Service implementing MCP tools and resources
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpToolService {
    
    private final McpConfiguration config;
    private final CalculatorTool calculatorTool;
    private final FileOperationsTool fileOperationsTool;
    private final DatabaseTool databaseTool;
    private final WebScraperTool webScraperTool;
    
    public Map<String, Object> listTools() {
        return Map.of("tools", List.of(
            Map.of(
                "name", "calculator",
                "description", "Perform basic arithmetic operations",
                "inputSchema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "operation", Map.of(
                            "type", "string",
                            "enum", List.of("add", "subtract", "multiply", "divide")
                        ),
                        "a", Map.of("type", "number"),
                        "b", Map.of("type", "number")
                    ),
                    "required", List.of("operation", "a", "b")
                )
            ),
            Map.of(
                "name", "file_operations",
                "description", "Safe file system operations",
                "inputSchema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "operation", Map.of(
                            "type", "string",
                            "enum", List.of("read", "write", "list", "delete")
                        ),
                        "path", Map.of("type", "string"),
                        "content", Map.of("type", "string")
                    ),
                    "required", List.of("operation", "path")
                )
            ),
            Map.of(
                "name", "database_query",
                "description", "Execute read-only SQL queries",
                "inputSchema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "query", Map.of("type", "string"),
                        "params", Map.of(
                            "type", "array",
                            "items", Map.of("type", "object")
                        )
                    ),
                    "required", List.of("query")
                )
            ),
            Map.of(
                "name", "web_scraper",
                "description", "Extract content from allowed websites",
                "inputSchema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "url", Map.of("type", "string"),
                        "selector", Map.of("type", "string"),
                        "maxLength", Map.of("type", "number", "default", 5000)
                    ),
                    "required", List.of("url")
                )
            )
        ));
    }
    
    public Object callTool(String toolName, Map<String, Object> arguments) {
        log.info("Calling tool: {} with arguments: {}", toolName, arguments);
        
        return switch (toolName) {
            case "calculator" -> calculatorTool.execute(arguments);
            case "file_operations" -> fileOperationsTool.execute(arguments);
            case "database_query" -> databaseTool.execute(arguments);
            case "web_scraper" -> webScraperTool.execute(arguments);
            default -> throw new IllegalArgumentException("Unknown tool: " + toolName);
        };
    }
    
    public Map<String, Object> listResources() {
        return Map.of("resources", List.of(
            Map.of(
                "uri", "resource://config",
                "name", "Server Configuration",
                "description", "Current server configuration",
                "mimeType", "application/json"
            ),
            Map.of(
                "uri", "resource://users",
                "name", "Demo Users",
                "description", "Demo user data",
                "mimeType", "application/json"
            ),
            Map.of(
                "uri", "resource://help",
                "name", "Help Documentation",
                "description", "Usage help and documentation",
                "mimeType", "text/plain"
            )
        ));
    }
    
    public Object readResource(String uri) {
        log.info("Reading resource: {}", uri);
        
        return switch (uri) {
            case "resource://config" -> List.of(Map.of(
                "uri", uri,
                "mimeType", "application/json",
                "text", "{\n  \"allowedDomains\": " + config.getAllowedDomains() + 
                       ",\n  \"maxFileSize\": " + config.getMaxFileSize() + 
                       ",\n  \"rateLimitRequests\": " + config.getRateLimitRequests() + 
                       "\n}"
            ));
            case "resource://users" -> List.of(Map.of(
                "uri", uri,
                "mimeType", "application/json",
                "text", "[\n  {\"id\": 1, \"name\": \"John Doe\", \"email\": \"john@example.com\"},\n" +
                       "  {\"id\": 2, \"name\": \"Jane Smith\", \"email\": \"jane@example.com\"}\n]"
            ));
            case "resource://help" -> List.of(Map.of(
                "uri", uri,
                "mimeType", "text/plain",
                "text", "MCP Boilerplate Server (Java)\n\nAvailable tools:\n" +
                       "- calculator: Basic arithmetic\n" +
                       "- file_operations: File system access\n" +
                       "- database_query: SQL queries\n" +
                       "- web_scraper: Web content extraction"
            ));
            default -> throw new IllegalArgumentException("Unknown resource: " + uri);
        };
    }
} 