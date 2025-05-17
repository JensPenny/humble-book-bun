# Humble Bundle CLI Tools

This directory contains CLI tools for analyzing Humble Bundle book bundles, fetching Goodreads ratings, and saving the data to a PostgreSQL database.

## Available Scripts

### API Client CLI

The API client script (`api-client.ts`) is designed to be run on a self-hosted server and connects to a PostgreSQL database.

```bash
# Run without saving to database
bun run cli:api

# Run with a specific URL
bun run cli:api https://www.humblebundle.com/books/your-bundle-url

# Run and save to database
bun run cli:api https://www.humblebundle.com/books/your-bundle-url --save
```

## Self-Hosted Server Setup

To run the API client on a self-hosted server:

1. Clone the repository
2. Install dependencies: `bun install`
3. Create a `.env` or `.env.local` file with the following PostgreSQL connection variables:
   ```
   PGHOST=postgres
   PGPORT=5432
   PGDATABASE=humble_bundles
   PGUSER=youruser
   PGPASSWORD=yourpassword
   ```
4. Make the shell script executable: `chmod +x cmd/run-humble-analyzer.sh`
5. Run the script: `./cmd/run-humble-analyzer.sh`

## Docker Deployment

The application can also be run in a Docker container:

1. Configure environment variables in `.env`
2. Run `./run-docker-job-local.sh` for local deployment or `./run-docker-job-ovh.sh` for OVH deployment

## How It Works

The application workflow:

1. Detects new Humble Bundle book bundles
2. For each bundle:
   - Fetches data from the Humble Bundle URL
   - Gets Goodreads ratings for each book
   - Saves the data to a PostgreSQL database
3. Exports the database data to JSON files for the Astro static site generator
4. Builds the static site
5. Commits and pushes the changes to GitHub

## Shortcomings

- Book bundles for TTRPG's may have some names that clash with existing books.
  For example: `Cat's Cradle` is a book in a TTRPG bundle, but is a book from `Kurt Vonnegut` as well. So these will fail. 
  The reason for this is that the goodreads search is implemented with a pretty basic string search on title.
- This also means that for some programming books with very generic titles, this will be the case as well
   - Any (tested) tips on how to overcome this are welcome. 
     Most solutions like checking for an author in the search just break a lot of actually working matches as well.
