package com.example.mcp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

/**
 * Main Spring Boot application for MCP Boilerplate Server
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.example.mcp")
public class McpBoilerplateApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(McpBoilerplateApplication.class, args);
    }
} 