# Network Intelligence API

<div align="center">

🚀 **Developer-focused API for Network Analysis**

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## 🎯 Overview

A comprehensive REST API for analyzing connectivity, DNS, HTTP, and TLS characteristics of hosts and URLs. Built for DevOps, SRE, debugging, monitoring, and security professionals.

**Think:** Pingdom + GTmetrix + DevTools Lite

## ✨ Features

### 🌐 Core Modules

| Module | Endpoint | Description |
|--------|----------|-------------|
| **Connectivity** | `/api/network/ping` | Measures latency and checks reachability |
| **DNS Intelligence** | `/api/network/dns` | Retrieves A, AAAA, MX, NS, TXT records |
| **HTTP Analysis** | `/api/network/http-analysis` | Analyzes status, headers, response time |
| **TLS Inspection** | `/api/network/tls-info` | Inspects certificates and TLS configuration |

### 🛡️ Built-in Security

- ✅ **SSRF Protection** - Blocks internal IPs and localhost
- ✅ **Rate Limiting** - 100 requests/minute per IP (configurable)
- ✅ **Input Validation** - Validates all domains and URLs
- ✅ **Timeout Controls** - Prevents blocking operations

### ⚡ Performance

- ✅ **Response Caching** - DNS and TLS results cached (5-60 minutes)
- ✅ **Caffeine Cache** - High-performance in-memory caching
- ✅ **Connection Pooling** - Efficient HTTP client reuse

## 🚀 Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+

### Installation

```bash
# Clone repository
git clone https://github.com/wintrich/network-intelligence-api.git
cd network-intelligence-api/backend

# Build project
mvn clean install

# Run application
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`

### Docker

```bash
# Build image
docker build -t network-intelligence-api .

# Run container
docker run -p 8080:8080 network-intelligence-api
```

## 📚 API Documentation

### Interactive Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/api-docs

### Example Requests

#### 1. Ping / Connectivity Check

```bash
curl "http://localhost:8080/api/network/ping?host=example.com"
```

**Response:**
```json
{
  "host": "example.com",
  "ip": "93.184.216.34",
  "reachable": true,
  "latencyMs": 34,
  "timestamp": "2026-02-15T12:00:00Z"
}
```

#### 2. DNS Lookup

```bash
curl "http://localhost:8080/api/network/dns?domain=example.com"
```

**Response:**
```json
{
  "domain": "example.com",
  "aRecords": ["93.184.216.34"],
  "aaaaRecords": ["2606:2800:220:1:248:1893:25c8:1946"],
  "mxRecords": [],
  "nsRecords": ["a.iana-servers.net", "b.iana-servers.net"],
  "txtRecords": ["v=spf1 -all"],
  "ttl": 86400
}
```

#### 3. HTTP Analysis

```bash
curl "http://localhost:8080/api/network/http-analysis?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "statusText": "OK",
  "responseTimeMs": 182,
  "contentType": "text/html",
  "server": "ECS",
  "headers": {
    "cache-control": "max-age=604800",
    "content-type": "text/html; charset=UTF-8"
  },
  "contentLength": 1256,
  "finalUrl": "https://example.com"
}
```

#### 4. TLS Certificate Inspection

```bash
curl "http://localhost:8080/api/network/tls-info?host=example.com"
```

**Response:**
```json
{
  "host": "example.com",
  "protocol": "TLSv1.3",
  "cipherSuite": "TLS_AES_256_GCM_SHA384",
  "issuer": "DigiCert Inc",
  "subject": "example.com",
  "validFrom": "2025-01-13",
  "validUntil": "2026-08-10",
  "daysUntilExpiry": 177,
  "expired": false,
  "serialNumber": "0E8BF3770D92D196F0BB61F93C4166BE",
  "subjectAlternativeNames": ["example.com", "*.example.com"]
}
```

## 🏗️ Architecture

### Clean Architecture Structure

```
backend/
├── src/main/java/tech/wintrich/networkapi/
│   ├── application/
│   │   └── service/              # Business logic services
│   ├── domain/
│   │   └── model/                # Domain entities (if needed)
│   ├── infrastructure/
│   │   ├── config/               # Spring configurations
│   │   ├── exception/            # Exception handlers
│   │   ├── ratelimit/            # Rate limiting
│   │   └── security/             # Security validators
│   └── presentation/
│       ├── controller/           # REST controllers
│       └── dto/                  # Data Transfer Objects
```

### Technology Stack

- **Framework**: Spring Boot 3.2.2
- **Language**: Java 17
- **DNS**: dnsjava 3.5.2
- **HTTP Client**: Java HTTP Client (built-in)
- **Caching**: Caffeine Cache
- **Rate Limiting**: Bucket4j
- **Documentation**: SpringDoc OpenAPI 3
- **Build Tool**: Maven

## ⚙️ Configuration

Edit `application.yml` to customize:

```yaml
api:
  network:
    timeout:
      ping: 3000        # Ping timeout (ms)
      dns: 5000         # DNS timeout (ms)
      http: 10000       # HTTP timeout (ms)
      tls: 5000         # TLS timeout (ms)
    
    rate-limit:
      enabled: true
      capacity: 100     # Max requests per period
      refill-period: 1m # Period for token refill
    
    security:
      block-internal-ips: true
      blocked-hosts:
        - localhost
        - 127.0.0.1
    
    cache:
      dns-ttl: 300      # DNS cache TTL (seconds)
      tls-ttl: 3600     # TLS cache TTL (seconds)
```

## 🔒 Security Features

### SSRF Protection

The API blocks requests to:
- Localhost (127.0.0.1, ::1)
- Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Link-local addresses (169.254.x.x)
- Multicast addresses

### Rate Limiting

- Default: 100 requests/minute per IP
- Configurable via `application.yml`
- Returns `429 Too Many Requests` when exceeded
- Includes `X-Rate-Limit-Remaining` header

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run with coverage
mvn test jacoco:report
```

## 📊 Monitoring

Health check endpoint: `http://localhost:8080/actuator/health`

Available actuator endpoints:
- `/actuator/health` - Application health status
- `/actuator/info` - Application information
- `/actuator/metrics` - Application metrics

## 🎨 Frontend Integration

This API is designed to work with modern frontend frameworks. Example React/Vue/Angular integration:

```typescript
// Example: TypeScript fetch wrapper
const networkApi = {
  ping: (host: string) => 
    fetch(`/api/network/ping?host=${encodeURIComponent(host)}`).then(r => r.json()),
  
  dns: (domain: string) => 
    fetch(`/api/network/dns?domain=${encodeURIComponent(domain)}`).then(r => r.json()),
  
  httpAnalysis: (url: string) => 
    fetch(`/api/network/http-analysis?url=${encodeURIComponent(url)}`).then(r => r.json()),
  
  tlsInfo: (host: string) => 
    fetch(`/api/network/tls-info?host=${encodeURIComponent(host)}`).then(r => r.json()),
};
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

- Website: https://wintrich.tech
- Email: contact@wintrich.tech
- GitHub: [@wintrich](https://github.com/wintrich)

---

<div align="center">
Made with ❤️ by Wintrich Tech
</div>
