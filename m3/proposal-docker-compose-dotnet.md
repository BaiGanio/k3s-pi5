# Proposal: .NET Docker Compose Module

Extracts from: `M3-Advanced-Docker.md` slides 42–51, `Practice-M3-Advanced-Docker.md` Compose section, `DOB-M3-Practice-Files/M3-2a/`, `DOB-M3-Practice-Files/M3-2b/`

## What Changes

| Original (PHP+MySQL) | Replacement (.NET + PostgreSQL) |
|---------------------|--------------------------------|
| `php:7.0-apache` base image | `mcr.microsoft.com/dotnet/aspnet:8.0` runtime image |
| No build step (interpreted) | Multi-stage Dockerfile: SDK build → runtime |
| `mysql:5.7` database | `postgres:16-alpine` (ARM64-compatible) |
| `mysqli` PHP extension | `Npgsql` NuGet package via `.csproj` |
| Apache on port 80 | Kestrel on port 8080 |
| `index.php` application | .NET 8 Minimal API (`Program.cs`) |

## Module Structure (to become `modules/m3/docker-compose-dotnet.js`)

### Section 1: The .NET Minimal API App

```csharp
// Program.cs — .NET 8 Minimal API with PostgreSQL
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var connString = builder.Configuration.GetConnectionString("Default")
    ?? "Host=db;Database=weatherapp;Username=postgres;Password=secret";

app.MapGet("/", () => "Weather API — GET /weather for forecast");
app.MapGet("/weather", async () =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand(
        "SELECT city, temperature, description FROM weather ORDER BY city", conn);
    using var reader = await cmd.ExecuteReaderAsync();
    var results = new List<object>();
    while (await reader.ReadAsync())
        results.Add(new { city = reader.GetString(0),
            temperature = reader.GetDouble(1), description = reader.GetString(2) });
    return Results.Ok(results);
});

app.Run();
```

```xml
<!-- WeatherApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="8.0.3" />
  </ItemGroup>
</Project>
```

### Section 2: Multi-Stage Dockerfile

```dockerfile
# Dockerfile — optimize for layer caching & small final image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/ || exit 1
ENTRYPOINT ["dotnet", "WeatherApi.dll"]
```

### Section 3: docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secret}
      POSTGRES_DB: weatherapp
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${API_PORT:-8080}:8080"
    environment:
      ConnectionStrings__Default: "Host=db;Database=weatherapp;Username=postgres;Password=${DB_PASSWORD:-secret}"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  pg-data:
```

### Section 4: Command Walkthrough (to become `commandData` entries)

| id | commandTitle | command | What it teaches |
|----|-------------|---------|-----------------|
| 350 | Examine docker-compose.yml | `cat docker-compose.yml` | Structure: services, networks, volumes, env vars |
| 351 | Examine Dockerfile | `cat Dockerfile` | Multi-stage build, layer optimization |
| 352 | Build images | `docker-compose build` | Reads Dockerfiles, tags images |
| 353 | Start the stack | `docker-compose up -d` | Creates containers, networks, volumes; -d detaches |
| 354 | Check running services | `docker-compose ps` | State of each service defined in the compose file |
| 355 | View logs | `docker-compose logs` | Aggregated stdout from all services |
| 356 | Test the API | `curl http://localhost:8080/weather` | End-to-end: .NET → PostgreSQL → JSON response |
| 357 | Stop without removing | `docker-compose stop` | Containers stop, volumes persist |
| 358 | Start again | `docker-compose start` | Restarts stopped containers, data intact |
| 359 | Stop and remove everything | `docker-compose down` | Removes containers + network, volumes survive |
| 360 | Remove with volumes | `docker-compose down -v` | Destroys everything including pg-data |

### Section 5: Node.js Alternative (side-by-side comparison)

The module should include a callout showing the equivalent Node.js stack for comparison:

```yaml
# Node.js equivalent — docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    # ... same as .NET version
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: "postgresql://postgres:secret@db:5432/weatherapp"
    depends_on:
      db:
        condition: service_healthy
```

```javascript
// server.js — Express + pg
const express = require('express');
const { Pool } = require('pg');
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/weather', async (req, res) => {
  const result = await pool.query('SELECT city, temperature, description FROM weather ORDER BY city');
  res.json(result.rows);
});
app.listen(3000, () => console.log('listening on 3000'));
```

## Deviations from Original M3 Material

1. **Build step required (.NET only):** PHP is interpreted — no build. .NET needs `dotnet publish`, which adds ~45s to first build. Multi-stage Dockerfile keeps the final image small (~210 MB).

2. **Postgres health check:** The original PHP examples assume MySQL is ready immediately. The .NET version uses `depends_on: condition: service_healthy` (Compose v3.8+) — the API waits until `pg_isready` returns OK.

3. **Connection strings:** PHP uses `mysqli_connect('c-mysql', 'root', '12345', 'appdb')` inline. .NET uses `appsettings.json` + `ASPNETCORE__ConnectionStrings__Default` env var — the idiomatic 12-factor way. Node.js uses `DATABASE_URL` connection string, which is also idiomatic.

4. **Port mapping:** PHP on Apache uses port 80 by default. .NET/Kestrel uses 8080. Node.js/Express conventionally uses 3000. The compose file must account for this.

5. **ARM64 compatibility:** All images used (`postgres:16-alpine`, `mcr.microsoft.com/dotnet/aspnet:8.0`, `node:20-alpine`) are multi-arch and work on both Raspberry Pi 5 (ARM64) and x86 machines.

## Estimated Module Size

~15–20 `commandData` entries covering the full Compose lifecycle with .NET + Node.js comparisons.
