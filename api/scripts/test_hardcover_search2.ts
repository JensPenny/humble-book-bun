import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql";
const token = process.env.HARDCOVER_API_TOKEN;

if (!token) {
  console.error("HARDCOVER_API_TOKEN is not set");
  process.exit(1);
}

// Try both casing options
const QUERIES = [
  {
    name: "SearchOutput (PascalCase)",
    query: `
      query {
        __type(name: "SearchOutput") {
          fields {
            name
            type { name kind }
          }
        }
      }
    `,
  },
  {
    name: "search_output (snake_case)",
    query: `
      query {
        __type(name: "search_output") {
          fields {
            name
            type { name kind }
          }
        }
      }
    `,
  },
  {
    name: "Direct search with common fields",
    query: `
      query {
        search(query: "Dune", per_page: 1, query_type: "Books") {
          hits {
            id
            title
            document_id
            slug
          }
          query
          page
          per_page
          total_hits
          processing_time_ms
        }
      }
    `,
  },
  {
    name: "Direct search with __typename",
    query: `
      query {
        search(query: "Dune", per_page: 1, query_type: "Books") {
          __typename
        }
      }
    `,
  },
];

async function testQuery(name: string, query: string): Promise<void> {
  console.log(`\n=== ${name} ===`);

  const response = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  if (data.errors) {
    console.log("Errors:");
    data.errors.forEach((e: any) => console.log(`  - ${e.message}`));
  } else {
    console.log("Success:", JSON.stringify(data, null, 2).substring(0, 800));
  }
}

async function main() {
  for (const q of QUERIES) {
    await testQuery(q.name, q.query);
  }
}

main();
