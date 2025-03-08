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

```
humble-book-bun/
├── src/
│   ├── core/       # Core functionality
│   │   └── humble.ts
│   ├── server/     # Web server
│   │   └── index.ts
│   ├── cli/        # Command line interface
│   │   └── index.ts
│   ├── utils/      # Utility functions
│   ├── types.ts    # TypeScript type definitions
│   ├── goodreads.ts # Goodreads API functions
│   └── index.ts    # Main entry point
├── vue-frontend/   # Vue frontend
│   ├── src/        # Vue components and logic
│   │   ├── App.vue
│   │   └── main.ts
│   └── index.html  # Frontend entry point
├── public/         # Static files served by the web server
│   └── dist/       # Built Vue app (generated)
└── package.json
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
# Use the default URL
bun run cli

# Specify a custom URL
bun run cli https://www.humblebundle.com/books/your-bundle-url
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

## Development

This project uses [Bun](https://bun.sh) as its JavaScript runtime and [Vue](https://vuejs.org) for the frontend.

### Backend Development

To run the backend development server with auto-reload:

```bash
bun run dev
```

### Frontend Development

To run the Vue development server:

```bash
bun run frontend:dev
```

This will start a development server at http://localhost:5173 with hot module replacement.

To check for TypeScript errors in the Vue components:

```bash
bun run frontend:type-check
```

## License

MIT
