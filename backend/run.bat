@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Using Java from: %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
echo.
echo Starting Spring Boot application...
echo.
mvnw.cmd spring-boot:run
