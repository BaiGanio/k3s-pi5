-- Weather schema + seed data (PostgreSQL).
-- Runs automatically against POSTGRES_DB (weatherapp) on first container start.

CREATE TABLE weather (
    city        VARCHAR(100),
    temperature DOUBLE PRECISION,
    description VARCHAR(255)
);

INSERT INTO weather (city, temperature, description) VALUES
    ('Berlin', 15.0, 'Rainy'),
    ('London', 12.5, 'Cloudy'),
    ('Sofia',  22.0, 'Sunny');
