# PostgreSQL image pre-seeded with the weather schema.
# .NET equivalent of the original M3-2b mysql/Dockerfile.
FROM postgres:16-alpine

COPY ./sql/init.sql /docker-entrypoint-initdb.d/init.sql
