# Use a single stage build for Render free tier
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy pre-built JAR (we'll build before pushing)
COPY target/*.jar app.jar

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
