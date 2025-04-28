#!/bin/bash

# Script to export database data to Astro site's data folder

# Set variables - now provided from an env file
# PGHOST="localhost"
# PGPORT="5432"
# PGUSERNAME="postgres"
# PGDATABASE="humble_bun"
ASTRO_DATA_DIR="../site_gen/humble_astro/data"

# Ensure the Astro data directory exists
mkdir -p "$ASTRO_DATA_DIR"

echo "Exporting data from PostgreSQL to Astro..."

# Run the SQL scripts to generate JSON files
echo "Exporting bundles..."
PGPASSWORD=${PGPASSWORD:-$(read -sp "Enter PostgreSQL password for $PGUSERNAME: " pwd && echo $pwd)} \
psql -h $PGHOST -p $PGPORT -U $PGUSERNAME -d $PGDATABASE -f export_bundles.sql

echo "Exporting books..."
psql -h $PGHOST -p $PGPORT -U $PGUSERNAME -d $PGDATABASE -f export_books.sql

echo "Exporting bundles with books..."
psql -h $PGHOST -p $PGPORT -U $PGUSERNAME -d $PGDATABASE -f export_bundles_with_books.sql

# Move the JSON files to the Astro data directory
echo "Moving JSON files to Astro data directory..."

# mv -b for 'normal' implementations, but this has to support docker so we split these up
cp "$ASTRO_DATA_DIR/bundles.json" "$ASTRO_DATA_DIR/bundles.json.bak" 
mv  bundles.json "$ASTRO_DATA_DIR/"
cp "$ASTRO_DATA_DIR/books.json" "$ASTRO_DATA_DIR/books.json.bak" 
mv books.json "$ASTRO_DATA_DIR/"
cp "$ASTRO_DATA_DIR/bundles_with_books.json" "$ASTRO_DATA_DIR/bundles_with_books.json.bak" 
mv bundles_with_books.json "$ASTRO_DATA_DIR/"

echo "Export complete! Data files are now in $ASTRO_DATA_DIR"
