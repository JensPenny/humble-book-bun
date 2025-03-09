import { analyzeBundleUrl } from "../core/humble";
import { join } from "path";

// Store results with an ID for retrieval
const results = new Map<string, any>();

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // API endpoints
    if (pathname === "/api/analyze" && req.method === "POST") {
      try {
        const body = await req.json();
        const bundleUrl = body.url;
        
        if (!bundleUrl) {
          return new Response(JSON.stringify({ error: "URL is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Generate a unique ID for this analysis
        const id = crypto.randomUUID();
        
        // Process the URL (this would be better as a background job in production)
        const booksWithRatings = await analyzeBundleUrl(bundleUrl);
        
        // Store the results
        results.set(id, {
          url: bundleUrl,
          timestamp: new Date().toISOString(),
          books: booksWithRatings
        });
        
        return new Response(JSON.stringify({ id, bookCount: booksWithRatings.length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    if (pathname.startsWith("/api/results/") && req.method === "GET") {
      const id = pathname.split("/").pop();
      const result = results.get(id || "");
      
      if (!result) {
        return new Response(JSON.stringify({ error: "Result not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Serve static files from the Svelte build
    if (pathname === "/" || pathname === "/index.html") {
      return new Response(Bun.file("public/dist/index.html"));
    }
    
    // Serve assets from the dist directory
    if (pathname.startsWith("/assets/")) {
      const filePath = `public/dist${pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        // Set appropriate content type based on file extension
        const contentType = getContentType(pathname);
        return new Response(file, {
          headers: { "Content-Type": contentType }
        });
      }
    }
    
    // Try to serve any other file from the dist directory
    const filePath = `public/dist${pathname}`;
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      // Set appropriate content type based on file extension
      const contentType = getContentType(pathname);
      return new Response(file, {
        headers: { "Content-Type": contentType }
      });
    }
    
    // If no file is found, serve the index.html for client-side routing
    return new Response(Bun.file("public/dist/index.html"));
  },
});

// Helper function to determine content type based on file extension
function getContentType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}

console.log(`Server running at http://localhost:${server.port}`);
