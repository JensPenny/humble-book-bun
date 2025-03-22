# Humble Bundle CLI Tools

This directory contains CLI tools for analyzing Humble Bundle book bundles and saving the data to a Cloudflare D1 database.

## Available Scripts

### Standard CLI (Uses D1 Bindings)

The standard CLI script (`index.ts`) is designed to be run in a Cloudflare Workers environment with D1 bindings.

```bash
# Run without saving to database
bun run cli

# Run with a specific URL
bun run cli https://www.humblebundle.com/books/your-bundle-url

# Run and save to database
bun run cli https://www.humblebundle.com/books/your-bundle-url --save
```

### API Client CLI (Uses Cloudflare API)

The API client script (`api-client.ts`) is designed to be run on a self-hosted server and uses the Cloudflare API to access the D1 database.

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
3. Create a `.env.local` file in the `api` directory with the following variables:
   ```
   todo fix these env vars
   ```
4. Make the shell script executable: `chmod +x run-humble-analyzer.sh`
5. Run the script: `./run-humble-analyzer.sh`

## Environment Variables

The API client requires the following environment variables:

todo fix these env variables

## How It Works

The API client:

1. Loads environment variables from the `.env.local` file
2. Fetches data from the specified Humble Bundle URL
3. Gets Goodreads ratings for each book
4. Optionally saves the data to a postgres database

## Shortcomings

- Book bundles for TTRPG's may have some names that clash with existing books.
  For example: `Cat's Cradle` is a book in a TTRPG bundle, but is a book from `Kurt Vonnegut` as well. So these will fail. 
  The reason for this is that the goodreads search is implemented with a pretty basic string search on title.
- This also means that for some programming books with very generic titles, this will be the case as well
   - Any (tested) tips on how to overcome this are welcome. 
     Most solutions like checking for an author in the search just break a lot of actually working matches as well.