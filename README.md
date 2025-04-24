# Humble Bundle Book Analyzer

A tool to analyze Humble Bundle book collections and fetch Goodreads ratings.

## Features

- Fetch and parse Humble Bundle book pages
- Extract book information including titles and authors
- Retrieve Goodreads ratings for each book
- Display results in a formatted list
- Vue-powered web interface for submitting URLs and viewing results
- Command-line interface for quick analysis

## Project Structure

The basic project is a bun project.
This project contains all code that generates the site with reviews.

1. The `api` contains the core functionality that will get the books in the bundle and that will fetch the goodreads ratings.
   These results will be posted to an internal postgres database. You will need to create your own `.env` file for this.
2. The `db` contains the database-scripts to create the necessary tables. 
   They also contain the scripts to export the data to json. 
   The shell script `export_to_astro.sh` contains code that can push this export to the `site_gen` folder.
3. The `site_gen` contains the astro site that can generate a static site from the exported database-files from step 2. 
   This site can then be statically deployed on a host.

Lastly, the root folder has a script `run-humble-analyzer.sh` that will run the API code, and that will persist the results to a database.

This means that some of the code in this repo will not be used, like the `frontend`. I just decided to keep them there for posterity's sake.
Worst case, they (badly) train some LLM.

```
humble-book-bun/
├── api/
│   ├── core/       # Core functionality
│       ├── goodreads.ts # Goodreads search functions
│       ├── humble.ts    # Humble scraping functions
│   ├── cli/        # Command line interface 
│   ├── server/     # Web server - not used when used as a standalone script
│   ├── types.ts    # TypeScript type definitions
│   └── index.ts    # Main entry point
├── db/             # Database folder. Contains table creation scripts, and export functions.
├── frontend/       # Vue frontend - only used for local testing
├── site_gen        # Contains the projects that will generate a static site for this export.
```

## Installation

To install dependencies:

```bash
bun install
```

## Usage

### Command Line Interface

To analyze a Humble Bundle URL via the command line:

```bash
./run-humble-analyzer.sh <book_url>
```

### Web Server with Vue Frontend

First, build the Vue frontend:

```bash
# Build the Vue frontend
bun run frontend:build
```

Then start the server:

```bash
# Start the server
bun run server
```

Open your browser to http://localhost:3000 to use the web interface.

### Astro site generation

First, cd into the correct folder: `cd site_gen/humble_astro`

`npm run dev` starts the astro dev server. This commonly opens up on http://localhost:4321.
`npm run build` generates the static site in a public-folder.

## Docker Usage

The project can be run in a Docker container, which handles all dependencies and environment setup automatically.

### Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database running in a container named `humble_data_pg` (or update the `.env.local` file with your database details)

### Setup

1. Make sure your PostgreSQL container is running and accessible
2. Ensure the Docker network exists by running:
   ```bash
   ./ensure-docker-network.sh
   ```
3. Configure your environment variables in `.env.local`

### Running the Docker Job

To run the full job in Docker, use the provided script:

```bash
./run-docker-job.sh
```

This script will:
1. Ensure the Docker network exists
2. Build the Docker image
3. Run the container with the appropriate environment variables and volume mounts
4. Execute the full script that:
   - Detects new bundles
   - Processes URLs
   - Exports data to the static site generator
   - Builds the static site
   - Commits and pushes changes to GitHub

### Manual Docker Commands

If you prefer to run the Docker commands manually:

```bash
# Build the Docker image
docker-compose -f local-docker-compose.yaml build

# Run the Docker container
docker-compose -f local-docker-compose.yaml up
```

## License
TODO
