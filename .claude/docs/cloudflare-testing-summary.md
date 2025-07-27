# Cloudflare Workers & Durable Objects Testing Guide

This document summarizes testing patterns and best practices for Cloudflare Workers and Durable Objects.

## Key Testing Principles

### Do NOT Mock These
- Durable Object storage operations (`ctx.storage.*`) - test against real storage
- WebSocket connections - test real WebSocket lifecycle  
- Core Cloudflare Workers APIs (`ctx.acceptWebSocket`, `env` bindings)
- Durable Object state and persistence mechanisms
- Workers runtime environment features

### DO Mock These
- External API calls (fetch to third-party services)
- Time-dependent functions (`Date.now()`, `setTimeout`, `setInterval`) 
- Network-dependent operations outside Workers runtime
- External service dependencies (databases, authentication services)

## Testing Framework Setup

### Vitest Configuration
```typescript
// vitest.config.ts - Recommended configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare', // For Cloudflare Workers environment
    globals: true,
  },
});
```

### Basic Test Structure
```typescript
import { unstable_dev } from 'wrangler';
import type { Unstable_DevWorker } from 'wrangler';

describe('Worker Tests', () => {
  let worker: Unstable_DevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  // Tests here...
});
```

## Durable Object Testing Patterns

### Storage Operations
```typescript
// Test persistence across operations
it('should persist data in storage', async () => {
  // Write to storage via HTTP request
  // Read from storage via another request
  // Verify data persistence
});

// Test storage isolation between instances
it('should maintain separate storage per instance', async () => {
  // Create multiple DO instances
  // Write different data to each
  // Verify isolation
});
```

### State Management
```typescript
// Test state initialization
it('should initialize with default state', async () => {
  const response = await worker.fetch('http://example.com/state');
  // Verify initial state
});

// Test state updates
it('should update state correctly', async () => {
  // Send state update request
  // Verify state change
  // Ensure persistence
});
```

### Lifecycle Testing
```typescript
// Test constructor behavior
it('should properly initialize Durable Object', async () => {
  // Test first request to DO
  // Verify proper initialization
});

// Test cleanup and resource management
it('should clean up resources properly', async () => {
  // Test resource cleanup scenarios
  // Verify no memory leaks
});
```

## WebSocket Testing

### Connection Establishment
```typescript
it('should establish WebSocket connection', async () => {
  const request = new Request('http://example.com/ws', {
    headers: { 'Upgrade': 'websocket' }
  });
  
  const response = await worker.fetch(request);
  expect(response.status).toBe(101);
  expect(response.webSocket).toBeDefined();
});
```

### Message Handling
```typescript
// Test message processing
it('should handle WebSocket messages', async () => {
  // Establish WebSocket connection
  // Send test message
  // Verify response or state change
});

// Test broadcast functionality
it('should broadcast to multiple connections', async () => {
  // Establish multiple connections
  // Send message from one
  // Verify all others receive it
});
```

### Connection Lifecycle
```typescript
// Test connection cleanup
it('should handle WebSocket disconnection', async () => {
  // Establish connection
  // Simulate disconnect
  // Verify cleanup
});
```

## HTTP Request Testing

### Endpoint Testing
```typescript
// Test different HTTP methods
it('should handle GET requests', async () => {
  const response = await worker.fetch('http://example.com/api');
  expect(response.status).toBe(200);
});

// Test request routing
it('should route requests correctly', async () => {
  const response = await worker.fetch('http://example.com/api/specific');
  // Verify correct handler was called
});
```

### Parameter Validation
```typescript
// Test query parameters
it('should validate query parameters', async () => {
  const url = new URL('http://example.com/api');
  url.searchParams.set('param', 'value');
  
  const response = await worker.fetch(url.toString());
  // Verify parameter handling
});

// Test request body parsing
it('should parse request body correctly', async () => {
  const response = await worker.fetch('http://example.com/api', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
    headers: { 'Content-Type': 'application/json' }
  });
  // Verify body processing
});
```

## Error Handling Testing

### Input Validation
```typescript
// Test invalid input handling
it('should reject invalid input', async () => {
  const response = await worker.fetch('http://example.com/api', {
    method: 'POST',
    body: 'invalid-json'
  });
  
  expect(response.status).toBe(400);
});
```

### Exception Handling
```typescript
// Test error scenarios
it('should handle errors gracefully', async () => {
  // Trigger error condition
  // Verify appropriate error response
  // Ensure system remains stable
});
```

## Environment and Bindings Testing

### Environment Variables
```typescript
// Test environment configuration
it('should access environment variables', async () => {
  // Make request that uses env vars
  // Verify correct configuration
});
```

### Service Bindings
```typescript
// Test service-to-service communication
it('should communicate with bound services', async () => {
  // Test requests to bound services
  // Verify proper integration
});
```

## Performance and Concurrency Testing

### Load Testing
```typescript
// Test concurrent requests
it('should handle multiple concurrent requests', async () => {
  const promises = Array.from({ length: 10 }, () =>
    worker.fetch('http://example.com/api')
  );
  
  const responses = await Promise.all(promises);
  responses.forEach(response => {
    expect(response.status).toBe(200);
  });
});
```

### Resource Management
```typescript
// Test resource limits
it('should respect memory limits', async () => {
  // Test memory-intensive operations
  // Verify proper resource management
});
```

## Testing Best Practices

### Test Isolation
- Each test should be independent
- Clean up state between tests when necessary
- Use unique identifiers to avoid conflicts

### Realistic Test Data
- Use data that mimics production scenarios
- Test edge cases and boundary conditions
- Include both valid and invalid input scenarios

### Integration vs Unit Testing
- Use `unstable_dev` for integration testing
- Test individual functions in isolation where possible
- Prefer integration tests for Workers-specific functionality

## Common Pitfalls to Avoid

1. **Over-mocking**: Don't mock core Workers APIs - test against real implementations
2. **Ignoring async behavior**: Properly handle async operations and WebSocket lifecycle
3. **Missing cleanup**: Ensure proper resource cleanup in tests
4. **Insufficient error testing**: Test both happy path and error scenarios
5. **Environment mismatch**: Ensure test environment matches production bindings
6. **Storage assumptions**: Don't assume storage state between tests - verify persistence explicitly

## Advanced Testing Scenarios

### Multi-Instance Testing
```typescript
// Test multiple Durable Object instances
it('should handle multiple DO instances', async () => {
  // Create requests for different DO instances
  // Verify proper isolation and communication
});
```

### Cross-Worker Communication
```typescript
// Test service bindings between workers
it('should communicate between workers', async () => {
  // Test worker-to-worker communication
  // Verify data flow and error handling
});
```

This guide provides the foundation for testing any Cloudflare Workers application while respecting the unique aspects of the Workers runtime environment.