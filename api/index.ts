// Main entry point for the application
// This file determines whether to run the CLI or the web server

// Check if the --server flag is provided
const runServer = process.argv.includes('--server');

if (runServer) {
  // Run the web server
  console.log('Starting web server...');
  import('./server/index.ts');
} else {
  // Run the CLI
  console.log('Running CLI mode...');
  import('./cli/index.ts');
}

// Usage:
// To run the CLI: bun run src/index.ts [URL]
// To run the server: bun run src/index.ts --server
