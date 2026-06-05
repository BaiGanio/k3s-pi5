// Program.cs — .NET 8 Minimal API with PostgreSQL (Npgsql, no EF)
// .NET equivalent of the original PHP index.php from M3-2b.
using Npgsql;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Supplied by the ConnectionStrings__Default environment variable in docker-compose.yml.
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
        results.Add(new
        {
            city = reader.GetString(0),
            temperature = reader.GetDouble(1),
            description = reader.GetString(2)
        });
    return Results.Ok(results);
});

app.Run();
