# Network Intelligence API - Architecture

## 🏗️ System Architecture

### Overview

The Network Intelligence API follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                 │
│  ┌─────────────────────────────────────────────┐  │
│  │ REST Controllers                            │  │
│  │ - NetworkController                         │  │
│  │ - DTOs (Request/Response objects)           │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                 Application Layer                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ Services (Business Logic)                   │  │
│  │ - ConnectivityService                       │  │
│  │ - DnsService                                │  │
│  │ - HttpAnalysisService                       │  │
│  │ - TlsService                                │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│               Infrastructure Layer                  │
│  ┌─────────────────────────────────────────────┐  │
│  │ External Integrations & Cross-cutting       │  │
│  │ - Security (SSRF protection)                │  │
│  │ - Rate Limiting (Bucket4j)                  │  │
│  │ - Caching (Caffeine)                        │  │
│  │ - Exception Handling                        │  │
│  │ - Configuration                             │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 📦 Module Breakdown

### 1. Connectivity Module

**Purpose**: Measure network latency and reachability

**Implementation**:
- Primary: System `ping` command (more accurate)
- Fallback: Java `InetAddress.isReachable()`
- DNS resolution via `InetAddress.getByName()`

**Flow**:
```
Request → Validate Host → Resolve DNS → Execute Ping → Measure Latency → Response
```

### 2. DNS Intelligence Module

**Purpose**: Comprehensive DNS record lookups

**Implementation**:
- Library: `dnsjava` (industry standard)
- Supports: A, AAAA, MX, NS, TXT records
- Extracts TTL information

**Flow**:
```
Request → Validate Domain → Lookup Records (parallel) → Cache Results → Response
```

**Caching**: 5 minutes (DNS TTL)

### 3. HTTP Analysis Module

**Purpose**: Analyze HTTP responses and performance

**Implementation**:
- Java 11+ HttpClient (async, connection pooling)
- Measures response time using nanosecond precision
- Follows redirects automatically
- Captures all headers

**Flow**:
```
Request → Validate URL → Send HTTP Request → Measure Time → Extract Headers → Response
```

**Features**:
- Redirect chain tracking
- Content-Type detection
- Server identification
- Response size measurement

### 4. TLS Certificate Inspection

**Purpose**: Inspect SSL/TLS certificates and connection details

**Implementation**:
- Java SSLSocket for TLS handshake
- X509Certificate parsing
- Subject Alternative Names (SANs) extraction

**Flow**:
```
Request → Validate Host → TLS Handshake → Extract Cert Info → Calculate Expiry → Response
```

**Caching**: 60 minutes (certificates change rarely)

**Data Extracted**:
- Protocol version (TLS 1.2, 1.3)
- Cipher suite
- Issuer & Subject
- Validity period
- Days until expiry
- SANs

## 🛡️ Security Architecture

### SSRF Protection (UrlValidator)

**Threat Model**: Prevent Server-Side Request Forgery attacks

**Protection Layers**:

1. **Host Validation**
   - Format validation (regex)
   - Blocked host list check
   - Localhost detection

2. **IP Range Blocking**
   - Private IPs: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
   - Link-local: 169.254.x.x
   - Loopback: 127.x.x.x
   - Multicast: 224.x.x.x

3. **Protocol Restriction**
   - Only HTTP/HTTPS allowed
   - Blocks file://, ftp://, gopher://, etc.

### Rate Limiting (Bucket4j)

**Algorithm**: Token Bucket

**Configuration**:
- Capacity: 100 tokens
- Refill: 100 tokens/minute
- Per-IP tracking
- In-memory storage (ConcurrentHashMap)

**Flow**:
```
Request → Extract Client IP → Get/Create Bucket → Try Consume Token
         ↓                                              ↓
    429 Error ← Token Unavailable    Token Available → Continue
```

**Headers**:
- `X-Rate-Limit-Remaining`: Tokens left

## ⚡ Performance Optimizations

### 1. Caching Strategy

**DNS Cache**:
- TTL: 5 minutes
- Key: domain name
- Purpose: Reduce DNS lookup overhead

**TLS Cache**:
- TTL: 60 minutes
- Key: hostname
- Purpose: Expensive TLS handshakes

**Cache Implementation**: Caffeine
- High-performance in-memory
- Automatic eviction
- Thread-safe
- Statistics tracking

### 2. Timeout Management

All network operations have timeouts:

| Operation | Timeout | Reason |
|-----------|---------|--------|
| Ping | 3s | Quick connectivity check |
| DNS | 5s | DNS queries should be fast |
| HTTP | 10s | Allow for slow servers |
| TLS | 5s | Handshake typically < 1s |

### 3. Connection Pooling

**HTTP Client**:
- Reuses connections
- Automatic connection management
- HTTP/2 support

## 🔄 Request Flow Example

### Complete Request Flow (HTTP Analysis)

```
1. Client Request
   GET /api/network/http-analysis?url=https://example.com

2. Rate Limit Check
   RateLimitInterceptor → Check bucket → Allow/Deny

3. Controller Validation
   NetworkController → @Validated → Parameter check

4. Security Validation
   UrlValidator → SSRF checks → Protocol validation

5. Service Execution
   HttpAnalysisService → Build request → Send HTTP → Measure

6. Response Building
   Extract data → Build DTO → Return JSON

7. Exception Handling (if error)
   GlobalExceptionHandler → Format error → Return 4xx/5xx

8. Client Response
   JSON response with HTTP analysis data
```

## 🎯 Design Patterns Used

| Pattern | Usage | Location |
|---------|-------|----------|
| **Builder** | DTO construction | All Response DTOs |
| **Strategy** | Ping methods (system vs Java) | ConnectivityService |
| **Interceptor** | Rate limiting | RateLimitInterceptor |
| **Singleton** | Service instances | Spring @Service |
| **Cache-Aside** | DNS/TLS caching | @Cacheable methods |
| **Factory** | SSL socket creation | TlsService |
| **Facade** | API simplification | NetworkController |

## 📊 Data Flow Diagrams

### DNS Lookup Flow

```
┌──────────┐     ┌────────────┐     ┌──────────┐     ┌─────────┐
│  Client  │────▶│ Controller │────▶│ Validator│────▶│ Service │
└──────────┘     └────────────┘     └──────────┘     └─────────┘
                                                           │
                 ┌──────────────────────────────────────────┘
                 ▼
            ┌─────────┐
            │  Cache  │
            └────┬────┘
                 │
            Cache Hit? ──No──▶ ┌──────────┐
                 │              │ dnsjava  │
                Yes             │  Lookup  │
                 │              └────┬─────┘
                 │                   │
                 ▼                   ▼
            ┌─────────────────────────┐
            │   Return Response       │
            └─────────────────────────┘
```

## 🧪 Testing Strategy

### Unit Tests
- Service logic testing
- UrlValidator security checks
- DTO serialization

### Integration Tests
- Full request/response cycle
- Rate limiting enforcement
- Cache behavior

### Security Tests
- SSRF attack scenarios
- IP blocking validation
- Rate limit bypass attempts

## 🚀 Deployment Architecture

### Production Considerations

1. **Horizontal Scaling**
   - Stateless API design
   - Rate limit storage needs Redis (for multi-instance)
   - Load balancer distribution

2. **Monitoring**
   - Spring Boot Actuator
   - Health checks
   - Metrics export (Prometheus-compatible)

3. **Logging**
   - Structured JSON logs
   - Request/response logging (sanitized)
   - Error tracking

4. **Security Hardening**
   - HTTPS only
   - API key authentication (future)
   - Request signing (future)

## 📈 Future Enhancements

### Planned Features

1. **Traceroute Module**
   - Network path visualization
   - Hop-by-hop latency

2. **Port Scanning** (careful!)
   - Common port checks
   - Service detection
   - Heavy rate limiting

3. **Geolocation**
   - IP to location mapping
   - CDN detection

4. **Historical Data**
   - Time-series storage
   - Uptime tracking
   - Performance trends

5. **WebSocket Support**
   - Real-time monitoring
   - Continuous ping streams

6. **Batch Operations**
   - Multiple host checks
   - Bulk DNS lookups

### Technical Debt

- [ ] Add comprehensive test coverage (target: 80%)
- [ ] Implement distributed rate limiting (Redis)
- [ ] Add API authentication
- [ ] Implement request tracing
- [ ] Add metrics dashboard
- [ ] Create load testing suite

## 🔧 Configuration Management

### Environment-Specific Configs

- `application.yml` - Base configuration
- `application-dev.yml` - Development overrides
- `application-prod.yml` - Production settings

### External Configuration

Supports:
- Environment variables
- System properties
- Config server (Spring Cloud Config)

---

This architecture ensures:
- **Scalability**: Stateless, cacheable, horizontally scalable
- **Security**: Multiple layers of protection
- **Performance**: Optimized with caching and timeouts
- **Maintainability**: Clean architecture, separation of concerns
- **Reliability**: Exception handling, health checks, monitoring
