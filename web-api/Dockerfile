FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# traceroute (UDP probes, no privileges needed) for the /api/network/traceroute endpoint.
# iputils-ping is kept around as a fallback for .NET's Ping class.
RUN apt-get update \
    && apt-get install -y --no-install-recommends traceroute iputils-ping \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/out .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "NetworkApi.dll"]
