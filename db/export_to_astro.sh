#!/bin/bash

# Script to export database data to Astro site's data folder

# Set variables
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="humble_bun"
ASTRO_DATA_DIR="../site_gen/humble_astro/data"

# Ensure the Astro data directory exists
mkdir -p "$ASTRO_DATA_DIR"

echo "Exporting data from PostgreSQL to Astro..."

# Run the SQL scripts to generate JSON files
echo "Exporting bundles..."
PGPASSWORD=${PGPASSWORD:-$(read -sp "Enter PostgreSQL password for $DB_USER: " pwd && echo $pwd)} \
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f export_bundles.sql

echo "Exporting books..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f export_books.sql

echo "Exporting bundles with books..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f export_bundles_with_books.sql

# Move the JSON files to the Astro data directory
echo "Moving JSON files to Astro data directory..."
mv -b bundles.json "$ASTRO_DATA_DIR/"
mv -b books.json "$ASTRO_DATA_DIR/"
mv -b bundles_with_books.json "$ASTRO_DATA_DIR/"

echo "Export complete! Data files are now in $ASTRO_DATA_DIR"
