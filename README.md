# 🚀 Wintrich.tech - Network Intelligence Platform

<div align="center">

**Full-stack Network Analysis & Monitoring Platform**

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A complete platform for analyzing connectivity, DNS, HTTP, and TLS characteristics of hosts and URLs.

**Perfect for: DevOps • SRE • Debugging • Monitoring • Security**

</div>

---

## 📁 Project Structure

```
WintrichTech/
├── backend/                    # Java Spring Boot REST API
│   ├── src/
│   │   ├── main/java/         # Service implementations
│   │   └── test/java/         # Unit & integration tests
│   ├── pom.xml                # Maven dependencies
│   ├── Dockerfile             # Docker configuration
│   ├── README.md              # Backend documentation
│   └── ARCHITECTURE.md        # Architecture deep-dive
│
└── src/                       # React Frontend (Clean Architecture)
    ├── domain/                # Core business logic
    ├── application/           # Application services
    ├── infrastructure/        # External integrations
    ├── presentation/          # React components & UI
    ├── shared/                # Utilities & types
    ├── ARCHITECTURE.md        # Frontend architecture
    └── EXAMPLE.md             # Code examples
```

---

## 🎯 Features

### 🛠️ Backend API (Java/Spring Boot)

| Module | Endpoint | Description |
|--------|----------|-------------|
| **Connectivity** | `/api/network/ping` | Measures latency and checks reachability |
| **DNS Intelligence** | `/api/network/dns` | Retrieves A, AAAA, MX, NS, TXT records |
| **HTTP Analysis** | `/api/network/http-analysis` | Analyzes status, headers, response time |
| **TLS Inspection** | `/api/network/tls-info` | Inspects certificates and TLS configuration |

**Built-in Security:**
- ✅ SSRF Protection (blocks internal IPs)
- ✅ Rate Limiting (100 req/min per IP)
- ✅ Input Validation
- ✅ Timeout Controls

**Performance:**
- ✅ Caffeine Caching (DNS: 5min, TLS: 60min)
- ✅ Connection Pooling
- ✅ Async HTTP Client

### 🎨 Frontend (React/TypeScript)

**Clean Architecture Structure:**
- Domain Layer - Business entities & logic
- Application Layer - Use cases & services
- Infrastructure Layer - API clients & storage
- Presentation Layer - React components & UI
- Shared Layer - Utilities & types

**Features:**
- Modern React 18 with TypeScript
- Vite for fast development
- Clean architecture principles
- Path aliases configured
- ESLint & TypeScript strict mode

---

## 🚀 Quick Start

### Backend (Java API)

```bash
# Navigate to backend
cd backend

# Run with Maven
mvn spring-boot:run

# Or with Docker
docker build -t network-api .
docker run -p 8080:8080 network-api
```

**API Documentation:** http://localhost:8080/swagger-ui.html

### Frontend (React)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

**Frontend URL:** http://localhost:5173

---

## 📚 Documentation

### Backend
- **[backend/README.md](backend/README.md)** - Getting started, API docs
- **[backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)** - System design
- **[backend/QUICKSTART.md](backend/QUICKSTART.md)** - Quick start guide
- **[backend/PROJECT_SUMMARY.md](backend/PROJECT_SUMMARY.md)** - Complete overview
- **[backend/VISUAL_GUIDE.md](backend/VISUAL_GUIDE.md)** - Architecture diagrams

### Frontend
- **[src/ARCHITECTURE.md](src/ARCHITECTURE.md)** - Clean architecture overview
- **[src/CLEAN_ARCHITECTURE_GUIDE.md](src/CLEAN_ARCHITECTURE_GUIDE.md)** - Patterns & best practices
- **[src/EXAMPLE.md](src/EXAMPLE.md)** - Complete code examples

---

## 🏗️ Technology Stack

### Backend
- **Framework:** Spring Boot 3.2.2
- **Language:** Java 17
- **DNS:** dnsjava 3.5.2
- **Cache:** Caffeine
- **Rate Limit:** Bucket4j
- **Docs:** SpringDoc OpenAPI 3
- **Build:** Maven

### Frontend
- **Framework:** React 18
- **Language:** TypeScript 5
- **Build Tool:** Vite
- **Styling:** CSS/CSS Modules
- **Architecture:** Clean Architecture

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
mvn test                    # Run all tests
mvn test jacoco:report      # Generate coverage
```

### Frontend Tests
```bash
npm test                    # Run tests
npm run test:coverage       # With coverage
```

---

## 🐳 Docker Support

### Backend Only
```bash
cd backend
docker-compose up -d
```

### Full Stack (Future)
```bash
docker-compose -f docker-compose.fullstack.yml up -d
```

---

## 📖 API Examples

### cURL
```bash
# Check connectivity
curl "http://localhost:8080/api/network/ping?host=example.com"

# DNS lookup
curl "http://localhost:8080/api/network/dns?domain=example.com"

# HTTP analysis
curl "http://localhost:8080/api/network/http-analysis?url=https://example.com"

# TLS certificate
curl "http://localhost:8080/api/network/tls-info?host=example.com"
```

### TypeScript (Frontend Integration)
```typescript
const networkAPI = {
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

---

## 🎨 Frontend Development

The frontend follows **Clean Architecture** principles:

```typescript
// Example: Using a service
import { UserService } from '@application/services/UserService';
import { useUser } from '@presentation/hooks/useUser';

// Example: Component
const UserProfile = () => {
  const { user } = useUser(userId);
  return <UserCard user={user} />;
};
```

Path aliases configured:
- `@domain/*` → `src/domain/*`
- `@application/*` → `src/application/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@presentation/*` → `src/presentation/*`
- `@shared/*` → `src/shared/*`

---

## 🔒 Security

### Backend Security
- **SSRF Protection**: Blocks localhost, internal IPs (10.x, 192.168.x, 172.16-31.x)
- **Rate Limiting**: 100 requests/minute per IP (configurable)
- **Input Validation**: All parameters validated
- **Timeouts**: All operations have timeouts (3-10s)
- **CORS**: Configured and restrictable

### Frontend Security
- TypeScript strict mode
- Input validation
- XSS protection (React default)
- Secure API communication

---

## 🌟 Use Cases

### DevOps & SRE
- Monitor service availability
- Verify DNS propagation after migration
- Check SSL certificate expiry dates
- Measure API response times

### Debugging
- Diagnose connectivity issues
- Analyze HTTP headers for caching
- Verify TLS configuration
- Trace network problems

### Security Auditing
- Certificate expiration monitoring
- TLS version verification
- HTTP security header analysis
- DNS configuration validation

### Monitoring & Alerting
- Uptime monitoring dashboard
- Latency tracking over time
- Certificate expiry alerts
- HTTP status monitoring

---

## 📊 Monitoring

### Backend Health Check
```bash
curl http://localhost:8080/actuator/health
```

### Available Metrics
- `/actuator/health` - Application health
- `/actuator/info` - Application info
- `/actuator/metrics` - Performance metrics

---

## 🔮 Roadmap

### Backend Enhancements
- [ ] Traceroute module
- [ ] Port scanner (with heavy rate limiting)
- [ ] Geolocation (IP to location)
- [ ] Historical data & time-series
- [ ] WebSocket real-time monitoring
- [ ] Batch operations
- [ ] API authentication (keys/OAuth)

### Frontend Features
- [ ] Dashboard with real-time charts
- [ ] Historical data visualization
- [ ] Multi-host monitoring
- [ ] Alert configuration
- [ ] Export reports (PDF/CSV)
- [ ] Dark mode
- [ ] Responsive mobile design

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact

- **Website**: https://wintrich.tech
- **Email**: contact@wintrich.tech
- **GitHub**: [@wintrich](https://github.com/wintrich)

---

<div align="center">

**🎉 Built with ❤️ for Developers, DevOps, and SREs 🎉**

**Backend:** Java 17 + Spring Boot 3  
**Frontend:** React 18 + TypeScript 5

</div
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
