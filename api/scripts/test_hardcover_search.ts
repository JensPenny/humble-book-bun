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

const SEARCH_QUERY = `
query SearchBooks($query: String!, $perPage: Int!) {
  search(query: $query, per_page: $perPage, query_type: "Books") {
    hits
  }
}
`;

async function testSearch(): Promise<void> {
  console.log("Testing Hardcover search endpoint...\n");

  const response = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { query: "Dune Frank Herbert", perPage: 3 },
    }),
  });

  console.log(`HTTP Status: ${response.status}`);

  const data = await response.json();

  if (data.errors) {
    console.log("❌ GraphQL Errors:");
    data.errors.forEach((e: any) => {
      console.log(`  - ${e.message}`);
    });
    return;
  }

  console.log("✓ SUCCESS!");
  console.log("Response structure:", JSON.stringify(data, null, 2).substring(0, 2000));
}

testSearch();
