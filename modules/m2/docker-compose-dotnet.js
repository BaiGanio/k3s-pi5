// modules/m2/docker-compose-dotnet.js
// M3: Advanced Docker — .NET Compose
// Extracted from DOB-M3-Practice-Files M3-2a / M3-2b (PHP+MySQL → .NET 8 + PostgreSQL)

window.commandData = [

  // ── Section 1: The .NET Application ─────────────────────────────────────────

  {
    id: 350, section: "app", sectionTitle: "The .NET 8 App",
    commandTitle: "Minimal API with PostgreSQL (Program.cs)",
    command: "cat Program.cs",
    searchTerms: "dotnet .net minimal api program.cs npgsql postgres weather endpoint",
    description: "A .NET 8 Minimal API with a single <code>/weather</code> endpoint that queries PostgreSQL using raw Npgsql. No Entity Framework — direct ADO.NET for clarity. This is what the Dockerfile will build and the Compose file will run.",
    parts: [
      { text: "var builder = WebApplication.CreateBuilder(args)", explanation: "bootstraps the ASP.NET host — reads appsettings.json, env vars, and sets up DI" },
      { text: "builder.Configuration.GetConnectionString(\"Default\")", explanation: "reads the connection string from config — in Docker this comes from the ConnectionStrings__Default env var" },
      { text: "new NpgsqlConnection(connString)", explanation: "opens a raw PostgreSQL connection — lightweight, no ORM overhead" },
      { text: "app.MapGet(\"/weather\", async () => { ... })", explanation: "Minimal API endpoint — returns JSON array of weather rows" },
    ],
    example: "// Program.cs\nusing Npgsql;\nvar builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\nvar cs = builder.Configuration.GetConnectionString(\"Default\")\n    ?? \"Host=db;Database=weatherapp;Username=postgres;Password=secret\";\napp.MapGet(\"/weather\", async () => {\n    using var conn = new NpgsqlConnection(cs);\n    await conn.OpenAsync();\n    using var cmd = new NpgsqlCommand(\n        \"SELECT city, temperature, description FROM weather ORDER BY city\", conn);\n    using var reader = await cmd.ExecuteReaderAsync();\n    var results = new List<object>();\n    while (await reader.ReadAsync())\n        results.Add(new { city = reader.GetString(0),\n            temperature = reader.GetDouble(1), description = reader.GetString(2) });\n    return Results.Ok(results);\n});\napp.Run();",
    why: ".NET 8 Minimal APIs are the modern equivalent of PHP index.php — no controllers, no Startup.cs, just a Program.cs file. The connection string is read from the environment, not hardcoded — this is the 12-factor app pattern."
  },

  {
    id: 351, section: "app", sectionTitle: "The .NET 8 App",
    commandTitle: "Project file with Npgsql dependency (WeatherApi.csproj)",
    command: "cat WeatherApi.csproj",
    searchTerms: "csproj .net project npgsql package reference sdk web",
    description: "The project file declares the SDK, target framework, and NuGet package dependencies. <code>Npgsql</code> is the PostgreSQL driver — the .NET equivalent of PHP's <code>mysqli</code> or Node.js's <code>pg</code> package.",
    parts: [
      { text: "<TargetFramework>net8.0</TargetFramework>", explanation: "targets .NET 8 LTS — supported until November 2026" },
      { text: "<Nullable>enable</Nullable>", explanation: "enables C# nullability warnings — catches potential NullReferenceExceptions at compile time" },
      { text: "PackageReference Include=\"Npgsql\"", explanation: "the Npgsql NuGet package — provides NpgsqlConnection, NpgsqlCommand, and async query methods" },
    ],
    example: "<Project Sdk=\"Microsoft.NET.Sdk.Web\">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <Nullable>enable</Nullable>\n    <ImplicitUsings>enable</ImplicitUsings>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include=\"Npgsql\" Version=\"8.0.3\" />\n  </ItemGroup>\n</Project>",
    why: "Unlike PHP which loads extensions from php.ini, .NET declares dependencies in the project file. <code>dotnet restore</code> reads this file and downloads Npgsql from NuGet — the same pattern as npm's package.json."
  },

  // ── Section 2: Multi-Stage Dockerfile ───────────────────────────────────────

  {
    id: 352, section: "dockerfile", sectionTitle: "Multi-Stage Dockerfile",
    commandTitle: "Build-stage + runtime-stage Dockerfile",
    command: "cat Dockerfile",
    searchTerms: "dockerfile multi-stage build sdk runtime dotnet publish aspnet optimize layers",
    description: "A two-stage Dockerfile: the <strong>build stage</strong> uses the .NET SDK image to compile and publish the app, then the <strong>runtime stage</strong> copies only the compiled output into a slim ASP.NET image. The SDK is never shipped to production — the final image is ~210 MB instead of ~800 MB.",
    parts: [
      { text: "FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build", explanation: "SDK image (~800 MB) — includes compilers, NuGet, and dotnet CLI tools" },
      { text: "COPY *.csproj . / RUN dotnet restore", explanation: "copies only the project file first and restores — Docker caches this layer until csproj changes" },
      { text: "RUN dotnet publish -c Release -o /app", explanation: "compiles the app in Release mode and outputs to /app — no source files included" },
      { text: "FROM mcr.microsoft.com/dotnet/aspnet:8.0", explanation: "runtime image (~210 MB) — only the ASP.NET Core runtime, no SDK" },
      { text: "COPY --from=build /app .", explanation: "copies only the compiled DLLs and dependencies from the build stage" },
    ],
    example: "FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /src\nCOPY *.csproj .\nRUN dotnet restore\nCOPY . .\nRUN dotnet publish -c Release -o /app\n\nFROM mcr.microsoft.com/dotnet/aspnet:8.0\nWORKDIR /app\nCOPY --from=build /app .\nENV ASPNETCORE_URLS=http://+:8080\nEXPOSE 8080\nHEALTHCHECK --interval=30s --timeout=3s \\\n  CMD curl -f http://localhost:8080/ || exit 1\nENTRYPOINT [\"dotnet\", \"WeatherApi.dll\"]",
    why: "PHP images don't need a build stage because PHP is interpreted. .NET is compiled — the SDK stage produces the binary, and the runtime stage runs it. This two-stage pattern keeps the final image small and secure (no compiler on the production image)."
  },

  // ── Section 3: Docker Compose File ──────────────────────────────────────────

  {
    id: 353, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: ".NET + PostgreSQL docker-compose.yml",
    command: "cat docker-compose.yml",
    searchTerms: "docker-compose yml dotnet .net postgres compose services networks volumes depends_on healthcheck",
    description: "Defines two services: <code>db</code> (PostgreSQL with a named volume) and <code>api</code> (.NET 8 app built from the Dockerfile). Both share a private bridge network. The <code>depends_on: condition: service_healthy</code> ensures the API waits for Postgres to be ready before starting.",
    parts: [
      { text: "services: db: / api:", explanation: "two services — the database and the .NET API that queries it" },
      { text: "build: context: . dockerfile: Dockerfile", explanation: "builds the api image from the Dockerfile in the current directory" },
      { text: "environment: POSTGRES_PASSWORD / ConnectionStrings__Default", explanation: "injects secrets and connection strings — never hardcode passwords in the compose file" },
      { text: "depends_on: db: condition: service_healthy", explanation: "waits for pg_isready to return OK before starting the API — prevents connection-refused errors on startup" },
      { text: "volumes: pg-data:/var/lib/postgresql/data", explanation: "named volume — database files survive docker-compose down (removed only with -v flag)" },
      { text: "networks: app-network: driver: bridge", explanation: "private bridge network — containers reach each other by service name (db, api) as DNS hostnames" },
    ],
    example: "version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: ${DB_PASSWORD:-secret}\n      POSTGRES_DB: weatherapp\n    volumes:\n      - pg-data:/var/lib/postgresql/data\n    networks:\n      - app-network\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U postgres\"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n\n  api:\n    build:\n      context: .\n      dockerfile: Dockerfile\n    ports:\n      - \"${API_PORT:-8080}:8080\"\n    environment:\n      ConnectionStrings__Default: \"Host=db;Database=weatherapp;Username=postgres;Password=${DB_PASSWORD:-secret}\"\n    depends_on:\n      db:\n        condition: service_healthy\n    networks:\n      - app-network\n\nnetworks:\n  app-network:\n    driver: bridge\n\nvolumes:\n  pg-data:",
    why: "A single docker-compose.yml replaces a wall of docker run commands. The service name <code>db</code> becomes the DNS hostname — your .NET connection string says <code>Host=db</code> and Docker resolves it to the Postgres container's IP. No hardcoded IPs, no links."
  },

  // ── Section 4: Compose Lifecycle ────────────────────────────────────────────

  {
    id: 354, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Build the .NET API image",
    command: "docker-compose build",
    searchTerms: "docker-compose build dotnet restore publish dockerfile layers cache",
    description: "Reads the Dockerfile and builds the <code>api</code> image. Services using pre-built images (like <code>postgres:16-alpine</code>) are skipped. The first build takes ~2 minutes (SDK download + NuGet restore + compilation); subsequent builds use Docker layer caching and finish in seconds.",
    parts: [
      { text: "docker-compose build", explanation: "builds every service that has a 'build' key in docker-compose.yml" },
      { text: "docker-compose build --no-cache", explanation: "forces a full rebuild ignoring all cached layers — use when dependencies change" },
    ],
    example: "$ docker-compose build\nBuilding api\nStep 1/10 : FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\n ---> a1b2c3d4e5f6\nStep 2/10 : WORKDIR /src\n ---> Running in ...\n...\nSuccessfully built abc123def456\nSuccessfully tagged m3_api:latest",
    why: "Separating build from run is a Compose best practice. You build once, then run many times. In Node.js, this step runs <code>npm install</code> — same pattern, different toolchain."
  },

  {
    id: 355, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Start the stack in detached mode",
    command: "docker-compose up -d",
    searchTerms: "docker-compose up detach start background containers create network volume",
    description: "Creates and starts all services defined in docker-compose.yml. The <code>-d</code> flag runs containers in the background (detached) so your terminal is free. Compose automatically creates the <code>app-network</code> bridge and the <code>pg-data</code> named volume if they don't exist.",
    parts: [
      { text: "docker-compose up", explanation: "creates and starts all services — without -d, log output streams to the terminal" },
      { text: "-d", explanation: "detached mode — containers run in background, terminal is free" },
      { text: "docker-compose up -d --build", explanation: "rebuilds images before starting — useful when you've changed the code" },
    ],
    example: "$ docker-compose up -d\nCreating network \"m3_app-network\" with driver \"bridge\"\nCreating volume \"m3_pg-data\" with default driver\nCreating m3_db_1 ... done\nCreating m3_api_1 ... done",
    why: "Compose starts db first (because of depends_on), waits for pg_isready, then starts api. This replaces the manual sequence: docker network create → docker volume create → docker run db → wait → docker run api."
  },

  {
    id: 356, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Check running services",
    command: "docker-compose ps",
    searchTerms: "docker-compose ps list services status running ports state",
    description: "Shows the state of every service defined in the compose file — name, command, state (Up, Exited), and exposed ports. Only services from the current directory's docker-compose.yml are shown.",
    parts: [
      { text: "docker-compose ps", explanation: "lists containers managed by this compose file — scoped to the current project" },
      { text: "docker-compose ps -q", explanation: "returns only container IDs — useful for scripting" },
    ],
    example: "$ docker-compose ps\n  Name        Command               State              Ports\n--------------------------------------------------------------------------\nm3_db_1    docker-entrypoint.sh postgres   Up (healthy)   5432/tcp\nm3_api_1   dotnet WeatherApi.dll           Up             0.0.0.0:8080->8080/tcp",
    why: "docker-compose ps only shows services from this project — unlike docker ps which shows everything on the host. The State column should show 'Up (healthy)' for db and 'Up' for api. If db shows 'Up (health: starting)' — give it 10 more seconds."
  },

  {
    id: 357, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "View aggregated logs",
    command: "docker-compose logs",
    searchTerms: "docker-compose logs stdout stderr aggregate all services follow tail",
    description: "Streams combined stdout and stderr from all services in one view. Add <code>--follow</code> to tail continuously, <code>--tail 50</code> to see only the last 50 lines, or specify a service name to filter.",
    parts: [
      { text: "docker-compose logs", explanation: "prints combined logs from all services and exits" },
      { text: "docker-compose logs -f", explanation: "follows log output — stays open like tail -f, Ctrl+C to exit" },
      { text: "docker-compose logs api", explanation: "shows logs only for the api service — filters out db noise" },
    ],
    example: "$ docker-compose logs api\napi_1  | info: Microsoft.Hosting.Lifetime[14]\napi_1  |       Now listening on: http://[::]:8080\napi_1  | info: Microsoft.Hosting.Lifetime[0]\napi_1  |       Application started. Press Ctrl+C to shut down.",
    why: "Without Compose, you'd need to docker logs each container individually. Compose aggregates them — the service name prefix (api_1 |) tells you which container produced each line."
  },

  {
    id: 358, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Test the .NET API end-to-end",
    command: "curl http://localhost:8080/weather",
    searchTerms: "curl test endpoint api json weather localhost 8080 dotnet postgres",
    description: "Sends an HTTP GET to the .NET API's /weather endpoint. If everything is wired correctly — Compose networking, Postgres credentials, Npgsql connection — you'll get a JSON array of weather rows. If not, the error message tells you exactly what's broken.",
    parts: [
      { text: "curl http://localhost:8080/weather", explanation: "GET request to the mapped port — Compose routes this to the api container's port 8080" },
      { text: "curl http://localhost:8080/", explanation: "hits the root endpoint — returns a plain-text hint: 'GET /weather for forecast'" },
    ],
    example: "$ curl http://localhost:8080/weather\n[{\"city\":\"London\",\"temperature\":12.5,\"description\":\"Cloudy\"},\n {\"city\":\"Sofia\",\"temperature\":22.0,\"description\":\"Sunny\"}]\n\n# Common errors:\n# \"Connection refused\" → api container hasn't finished starting (wait 5s)\n# \"Npgsql.PostgresException: 28P01\" → password mismatch between compose file and Postgres\n# Empty array [] → database exists but weather table is empty — seed it first",
    why: "This is the end-to-end smoke test. If curl returns JSON, the entire chain works: Docker networking → Compose DNS → .NET Kestrel → Npgsql → PostgreSQL → query execution → serialization."
  },

  {
    id: 359, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Stop services without removing them",
    command: "docker-compose stop",
    searchTerms: "docker-compose stop pause containers preserve data state volumes survive",
    description: "Stops all running services but preserves the containers, networks, and volumes. A subsequent <code>docker-compose start</code> restarts everything in the same state. Use this when you want to pause the stack without losing data.",
    parts: [
      { text: "docker-compose stop", explanation: "sends SIGTERM then SIGKILL after a timeout — containers stop but are not removed" },
      { text: "docker-compose stop api", explanation: "stops only the api service — db keeps running" },
    ],
    example: "$ docker-compose stop\nStopping m3_api_1 ... done\nStopping m3_db_1  ... done\n\n$ docker-compose ps\n  Name        Command               State     Ports\n-------------------------------------------------------\nm3_db_1    docker-entrypoint.sh ...   Exit 0\nm3_api_1   dotnet WeatherApi.dll     Exit 0",
    why: "Stop vs Down: stop preserves containers (fast restart), down removes them (clean slate). Think of stop as 'pause' and down as 'tear down'. Volumes survive both — only docker-compose down -v destroys data."
  },

  {
    id: 360, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Restart stopped services",
    command: "docker-compose start",
    searchTerms: "docker-compose start restart resume stopped containers data intact postgres",
    description: "Restarts services that were previously stopped with <code>docker-compose stop</code>. Containers, networks, and volumes are reused — Postgres data from the previous session is still there. Much faster than <code>up</code> because images don't need to be rebuilt.",
    parts: [
      { text: "docker-compose start", explanation: "restarts all stopped containers defined in the compose file" },
      { text: "docker-compose start db", explanation: "restarts only the database — api stays stopped" },
    ],
    example: "$ docker-compose start\nStarting db  ... done\nStarting api ... done\n\n$ curl http://localhost:8080/weather\n# Same data as before — pg-data volume was preserved across stop/start",
    why: "This is the proof that named volumes work. docker-compose stop → docker-compose start → curl /weather returns the same data. The database survived the container lifecycle — this is why you use volumes instead of storing data inside the container."
  },

  {
    id: 361, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Stop and remove everything (keep volumes)",
    command: "docker-compose down",
    searchTerms: "docker-compose down remove containers network cleanup teardown volumes survive",
    description: "Stops all services and removes the containers and the default network. Named volumes (<code>pg-data</code>) are preserved — your database files survive. Add <code>-v</code> to also remove volumes (destroys all data).",
    parts: [
      { text: "docker-compose down", explanation: "stops containers, removes them and the network — volumes survive" },
      { text: "docker-compose down -v", explanation: "also removes named volumes — DESTROYS all Postgres data, irreversible" },
      { text: "docker-compose down --rmi all", explanation: "also removes the images built by docker-compose build" },
    ],
    example: "$ docker-compose down\nStopping m3_api_1 ... done\nStopping m3_db_1  ... done\nRemoving m3_api_1 ... done\nRemoving m3_db_1  ... done\nRemoving network m3_app-network\n\n$ docker volume ls\nDRIVER   VOLUME NAME\nlocal    m3_pg-data     # ← volume still exists!",
    why: "The default docker-compose down preserves data by design — you have to explicitly add -v to destroy it. This prevents accidental data loss. In production, you'd back up pg-data before running down -v."
  },

  {
    id: 362, section: "compose", sectionTitle: "Docker Compose File",
    commandTitle: "Stop, remove everything including data",
    command: "docker-compose down -v",
    searchTerms: "docker-compose down volumes remove delete all data destroy irreversible",
    description: "The nuclear option: stops containers, removes them, removes the network, AND deletes all named volumes including <code>pg-data</code>. All Postgres data is permanently destroyed. Only use this when you want a completely clean slate.",
    parts: [
      { text: "docker-compose down -v", explanation: "-v flag is what destroys volumes — without it, data survives" },
      { text: "docker-compose down -v --rmi all", explanation: "also removes images — completely clean state, as if you never ran Compose" },
    ],
    example: "$ docker-compose down -v\nRemoving m3_api_1 ... done\nRemoving m3_db_1  ... done\nRemoving network m3_app-network\nRemoving volume m3_pg-data    # ← volume gone\n\n$ docker volume ls\nDRIVER   VOLUME NAME\n# (empty — pg-data is gone)",
    why: "Treat docker-compose down -v like DROP DATABASE. Use it when you're done with an exercise or when the database schema has changed incompatibly and you need a fresh start. Always back up first if the data matters."
  },

  // ── Section 5: Node.js Comparison ───────────────────────────────────────────

  {
    id: 363, section: "compare", sectionTitle: ".NET vs Node.js",
    commandTitle: "Node.js equivalent — docker-compose.yml",
    command: "cat docker-compose.node.yml",
    searchTerms: "node.js nodejs express pg postgres docker-compose comparison dotnet .net stack",
    description: "The same two-service stack in Node.js. Compare the differences: port 3000 vs 8080, DATABASE_URL connection string vs ConnectionStrings__Default, npm install build vs dotnet publish. The Docker Compose mechanics (services, networks, volumes) are identical — only the application stack changes.",
    parts: [
      { text: "ports: '3000:3000'", explanation: "Node.js/Express conventionally listens on port 3000 — .NET/Kestrel uses 8080" },
      { text: "DATABASE_URL: postgresql://...", explanation: "Node.js uses a single connection string env var — .NET uses the ConnectionStrings__Default key" },
      { text: "image: node:20-alpine (~180 MB)", explanation: "Node.js runtime image is ~30 MB smaller than .NET's aspnet:8.0 image (~210 MB)" },
    ],
    example: "# Node.js docker-compose.yml (compare with .NET version)\nservices:\n  db:\n    image: postgres:16-alpine\n    # ... identical to .NET version\n  api:\n    build: .\n    ports:\n      - '3000:3000'\n    environment:\n      DATABASE_URL: \"postgresql://postgres:${DB_PASSWORD}@db:5432/weatherapp\"\n    depends_on:\n      db:\n        condition: service_healthy\n\n// server.js\nconst { Pool } = require('pg');\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\napp.get('/weather', async (req, res) => {\n  const r = await pool.query('SELECT city, temperature, description FROM weather');\n  res.json(r.rows);\n});",
    why: "Learning both stacks makes you a better DevOps engineer. The Compose layer is identical — the application layer differs in port conventions, env var naming, and build toolchain. Understanding these differences lets you containerize any application regardless of language."
  },

];
