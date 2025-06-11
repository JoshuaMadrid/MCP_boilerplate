package com.example.mcp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuration properties for MCP Server
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "mcp")
public class McpConfiguration {
    
    private boolean requireAuth = false;
    private String jwtSecret = "your-secret-key-change-in-production";
    private List<String> allowedDomains = List.of("example.com", "httpbin.org", "jsonplaceholder.typicode.com");
    private long maxFileSize = 10 * 1024 * 1024; // 10MB
    private int rateLimitRequests = 100;
    private int rateLimitWindow = 3600; // 1 hour
    private List<String> allowedDirectories = List.of("/tmp", "/var/tmp");
} 