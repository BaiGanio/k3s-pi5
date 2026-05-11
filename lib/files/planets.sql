-- planets.sql — PostgreSQL version
-- Originally T-SQL (SQL Server). Converted: BIT→BOOLEAN, removed GO/USE,
-- replaced system-catalog checks with pg-compatible equivalents.
-- See vagrant-parallels.js for the T-SQL vs PostgreSQL comparison note.

-- Create the database (run as superuser, outside any transaction block)
-- CREATE DATABASE planets;
-- Note: database creation is typically done at the shell level or
-- by the provisioner — see the vagrant-parallels module.

-- Drop and recreate the Planet table
DROP TABLE IF EXISTS Planet;

CREATE TABLE Planet (
    PlanetID        INT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    MassEarths      DECIMAL(10,4),
    RadiusKm        DECIMAL(10,2),
    DistanceAU      DECIMAL(10,4),
    HasRings        BOOLEAN,
    Atmosphere      VARCHAR(255),
    DiscoveredBy    VARCHAR(100),
    DiscoveryYear   INT,
    ImgUrl          VARCHAR(500)
);

-- Insert data
INSERT INTO Planet
(PlanetID, Name, MassEarths, RadiusKm, DistanceAU, HasRings, Atmosphere, DiscoveredBy, DiscoveryYear, ImgUrl)
VALUES
(1, 'Mercury', 0.055, 2439.7, 0.39, FALSE, 'Oxygen, Sodium, Hydrogen', NULL, NULL,
 'https://wallpaperaccess.com/full/1133845.jpg'),

(2, 'Venus', 0.815, 6051.8, 0.72, FALSE, 'CO2, Nitrogen', NULL, NULL,
 'https://svs.gsfc.nasa.gov/vis/a030000/a030300/a030358/venus-magellan_print.jpg'),

(3, 'Earth', 1.000, 6371.0, 1.00, FALSE, 'Nitrogen, Oxygen', NULL, NULL,
 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/globe_east_2048.jpg'),

(4, 'Mars', 0.107, 3389.5, 1.52, FALSE, 'CO2, Nitrogen, Argon', NULL, NULL,
 'https://solarsystem.nasa.gov/system/feature_items/images/19_mars.png'),

(5, 'Jupiter', 317.8, 69911, 5.20, TRUE, 'Hydrogen, Helium', 'Galileo Galilei', 1610,
 'https://solarsystem.nasa.gov/system/feature_items/images/16_jupiter_new.png'),

(6, 'Saturn', 95.16, 58232, 9.58, TRUE, 'Hydrogen, Helium', 'Galileo Galilei', 1610,
 'https://solarsystem.nasa.gov/system/feature_items/images/28_saturn.png'),

(7, 'Uranus', 14.54, 25362, 19.22, TRUE, 'Hydrogen, Helium, Methane', 'William Herschel', 1781,
 'https://solarsystem.nasa.gov/system/feature_items/images/29_uranus.png'),

(8, 'Neptune', 17.15, 24622, 30.05, TRUE, 'Hydrogen, Helium, Methane', 'Urbain Le Verrier', 1846,
 'https://solarsystem.nasa.gov/system/feature_items/images/30_neptune.png');
