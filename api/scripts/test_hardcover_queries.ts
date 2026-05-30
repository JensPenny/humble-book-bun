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

const QUERIES = [
  {
    name: "Simple title search (no author)",
    query: `
query SearchBook($title: String!) {
  books(
    where: { title: { _ilike: $title } }
    order_by: { users_read_count: desc }
    limit: 1
  ) {
    title
    slug
    rating
    ratings_count
    reviews_count
  }
}
`,
    variables: { title: "%Dune%" },
  },
  {
    name: "Title + author search (nested contributors)",
    query: `
query SearchBook($title: String!, $author: String) {
  books(
    where: {
      _and: [
        { title: { _ilike: $title } }
        { contributors: { author: { name: { _ilike: $author } } } }
      ]
    }
    order_by: { users_read_count: desc }
    limit: 1
  ) {
    title
    slug
    rating
    ratings_count
    reviews_count
  }
}
`,
    variables: { title: "%Dune%", author: "%Frank Herbert%" },
  },
  {
    name: "Introspection - list available fields on books",
    query: `
query {
  __type(name: "books") {
    fields {
      name
      type {
        name
      }
    }
  }
}
`,
    variables: {},
  },
];

async function testQuery(name: string, query: string, variables: any): Promise<void> {
  console.log(`\n=== Testing: ${name} ===`);
  console.log(`Query: ${query.replace(/\s+/g, " ").trim().substring(0, 120)}...`);

  try {
    const response = await fetch(HARDCOVER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log(`HTTP Status: ${response.status}`);

    const data = await response.json();

    if (data.errors) {
      console.log(`❌ GraphQL Errors:`);
      data.errors.forEach((e: any) => {
        console.log(`  - ${e.message}`);
      });
    } else if (data.data) {
      console.log(`✓ SUCCESS!`);
      console.log(`Response: ${JSON.stringify(data.data, null, 2).substring(0, 300)}...`);
    }
  } catch (err: any) {
    console.error(`❌ Fetch error: ${err.message}`);
  }
}

async function main() {
  for (const test of QUERIES) {
    await testQuery(test.name, test.query, test.variables);
  }
  console.log("\n=== Done ===");
}

main();
