# PostgreSQL image pre-seeded with the weather schema.
# .NET equivalent of the original M3-2a mysql/Dockerfile.
FROM postgres:16-alpine

# Scripts in /docker-entrypoint-initdb.d run once, against POSTGRES_DB, on first start.
COPY ./sql/init.sql /docker-entrypoint-initdb.d/init.sql
