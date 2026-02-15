# 🚀 Network Intelligence API - Quick Start Guide

## Installation Options

### Option 1: Maven (Recommended for Development)

```bash
# Navigate to backend directory
cd backend

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

The API will be available at: **http://localhost:8080**

### Option 2: JAR File

```bash
# Build JAR
mvn clean package

# Run JAR
java -jar target/network-intelligence-api-1.0.0.jar
```

### Option 3: Docker

```bash
# Build image
docker build -t network-api .

# Run container
docker run -p 8080:8080 network-api
```

### Option 4: Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📖 API Documentation

Once running, access interactive documentation:

- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/api-docs

## 🧪 Test the API

### Using cURL

```bash
# Test connectivity
curl "http://localhost:8080/api/network/ping?host=example.com"

# DNS lookup
curl "http://localhost:8080/api/network/dns?domain=example.com"

# HTTP analysis
curl "http://localhost:8080/api/network/http-analysis?url=https://example.com"

# TLS info
curl "http://localhost:8080/api/network/tls-info?host=example.com"
```

### Using PowerShell (Windows)

```powershell
# Test connectivity
Invoke-RestMethod "http://localhost:8080/api/network/ping?host=example.com" | ConvertTo-Json

# DNS lookup
Invoke-RestMethod "http://localhost:8080/api/network/dns?domain=example.com" | ConvertTo-Json

# HTTP analysis
Invoke-RestMethod "http://localhost:8080/api/network/http-analysis?url=https://example.com" | ConvertTo-Json

# TLS info
Invoke-RestMethod "http://localhost:8080/api/network/tls-info?host=example.com" | ConvertTo-Json
```

### Using Browser

Simply visit:
- http://localhost:8080/api/network/ping?host=example.com
- http://localhost:8080/api/network/dns?domain=example.com

## 🛠️ Configuration

Edit `src/main/resources/application.yml` to customize:

```yaml
server:
  port: 8080  # Change port

api:
  network:
    rate-limit:
      capacity: 100  # Requests per minute
    timeout:
      ping: 3000     # Timeout in milliseconds
```

## 🧪 Run Tests

```bash
# Run all tests
mvn test

# Run tests with coverage
mvn test jacoco:report

# View coverage report
open target/site/jacoco/index.html
```

## 📊 Health Check

```bash
curl http://localhost:8080/actuator/health
```

Expected response:
```json
{
  "status": "UP"
}
```

## 🐛 Troubleshooting

### Port Already in Use

Change port in `application.yml` or use environment variable:
```bash
SERVER_PORT=8081 mvn spring-boot:run
```

### Java Version Issues

Ensure Java 17 or higher:
```bash
java -version
```

### Build Failures

Clear Maven cache:
```bash
mvn clean install -U
```

### Network Timeouts

Increase timeouts in `application.yml`:
```yaml
api:
  network:
    timeout:
      http: 15000  # 15 seconds
```

## 📚 Next Steps

1. **Explore API**: Visit Swagger UI at http://localhost:8080/swagger-ui.html
2. **Read Documentation**: Check `README.md` and `ARCHITECTURE.md`
3. **Build Frontend**: Use the API with your React/Vue/Angular app
4. **Deploy**: Use Docker for production deployment

## 💡 Example Use Cases

### Monitor Website
```bash
# Check if website is up and measure latency
curl "http://localhost:8080/api/network/ping?host=mywebsite.com"
```

### Verify DNS Configuration
```bash
# Check DNS records after domain update
curl "http://localhost:8080/api/network/dns?domain=mywebsite.com"
```

### Audit SSL Certificate
```bash
# Check certificate expiration
curl "http://localhost:8080/api/network/tls-info?host=mywebsite.com"
```

### Performance Testing
```bash
# Measure response time
curl "http://localhost:8080/api/network/http-analysis?url=https://mywebsite.com"
```

## 🔒 Security Notes

- The API blocks requests to localhost and internal IPs by default
- Rate limiting is enabled (100 requests/minute per IP)
- SSRF protection is active
- All network operations have timeouts

## 📞 Support

- Documentation: `README.md`
- Architecture: `ARCHITECTURE.md`
- Issues: GitHub Issues
- Email: contact@wintrich.tech

---

**Happy Coding! 🚀**
