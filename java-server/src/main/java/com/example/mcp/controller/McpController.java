package com.example.mcp.controller;

import com.example.mcp.config.McpConfiguration;
import com.example.mcp.service.McpToolService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Main MCP Controller handling tool calls and resources
 */
@Slf4j
@RestController
@RequestMapping("/mcp")
@RequiredArgsConstructor
public class McpController {
    
    private final McpToolService toolService;
    private final McpConfiguration config;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "mcp-boilerplate-java",
            "version", "1.0.0"
        ));
    }
    
    @PostMapping("/tools/list")
    public ResponseEntity<?> listTools() {
        try {
            return ResponseEntity.ok(toolService.listTools());
        } catch (Exception e) {
            log.error("Error listing tools", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to list tools: " + e.getMessage()));
        }
    }
    
    @PostMapping("/tools/call")
    public ResponseEntity<?> callTool(@RequestBody Map<String, Object> request) {
        try {
            String toolName = (String) request.get("name");
            @SuppressWarnings("unchecked")
            Map<String, Object> arguments = (Map<String, Object>) request.get("arguments");
            
            Object result = toolService.callTool(toolName, arguments);
            return ResponseEntity.ok(Map.of("content", result));
        } catch (Exception e) {
            log.error("Error calling tool", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Tool call failed: " + e.getMessage()));
        }
    }
    
    @PostMapping("/resources/list")
    public ResponseEntity<?> listResources() {
        try {
            return ResponseEntity.ok(toolService.listResources());
        } catch (Exception e) {
            log.error("Error listing resources", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to list resources: " + e.getMessage()));
        }
    }
    
    @PostMapping("/resources/read")
    public ResponseEntity<?> readResource(@RequestBody Map<String, String> request) {
        try {
            String uri = request.get("uri");
            Object content = toolService.readResource(uri);
            return ResponseEntity.ok(Map.of("contents", content));
        } catch (Exception e) {
            log.error("Error reading resource", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Resource read failed: " + e.getMessage()));
        }
    }
} 