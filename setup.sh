#!/bin/bash

# Exit the script if any command fails
set -e

# Download the OSM file
echo "Downloading the OSM file..."
wget -P ./data/osrm https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf

# Prepare OSRM files
echo "Preparing the OSRM files..."
docker run -t -v $(pwd)/data/osrm:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/israel-and-palestine-latest.osm.pbf
docker run -t -v $(pwd)/data/osrm:/data osrm/osrm-backend osrm-partition /data/israel-and-palestine-latest.osrm
docker run -t -v $(pwd)/data/osrm:/data osrm/osrm-backend osrm-customize /data/israel-and-palestine-latest.osrm

# Start Docker Compose
echo "Starting Docker Compose..."
docker-compose up -d

# Wait for the database to initialize
echo "Waiting for the database to initialize..."
sleep 10

# Create the database and enable PostGIS
echo "Creating the database and enabling PostGIS..."
docker-compose exec postgres psql -U geouser -c "CREATE DATABASE geodb;"
docker-compose exec postgres psql -U geouser -d geodb -c "CREATE EXTENSION postgis;"
docker-compose exec postgres psql -U geouser -d geodb -c "CREATE EXTENSION hstore;"

# Import OSM data into the database
echo "Importing OSM data into the database..."
docker-compose exec postgres osm2pgsql --create --slim --hstore --database=geodb /data/israel-and-palestine-latest.osm.pbf

# Create the addresses table
echo "Creating the addresses table..."
docker-compose exec postgres psql -U geouser -d geodb -c "
CREATE TABLE IF NOT EXISTS osm_addresses AS
SELECT 
  tags->'addr:street' AS street,
  tags->'addr:city' AS city,
  ST_AsText(ST_Transform(way, 4326)) AS coordinates
FROM planet_osm_point
WHERE tags ? 'addr:street' AND tags ? 'addr:city';
"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Start the server
echo "Starting the server..."
npm start

echo "Setup completed successfully!"
