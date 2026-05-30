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

const FULL_QUERY = `
query SearchAndGetBooks($query: String!, $perPage: Int!) {
  search(query: $query, per_page: $perPage, query_type: "Books") {
    ids
    page
    per_page
    query
    query_type
    error
  }
}
`;

const BOOKS_BY_IDS_QUERY = `
query GetBooksByIds($ids: [Int!]!) {
  books(where: { id: { _in: $ids } }, limit: 10) {
    id
    title
    slug
    rating
    ratings_count
    reviews_count
    cached_contributors
  }
}
`;

async function testSearchFlow(): Promise<void> {
  console.log("Step 1: Search for 'Dune'\n");

  const searchResponse = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: FULL_QUERY,
      variables: { query: "Dune", perPage: 5 },
    }),
  });

  const searchData = await searchResponse.json();

  if (searchData.errors) {
    console.error("Search errors:", searchData.errors);
    return;
  }

  const searchResult = searchData.data.search;
  console.log("Search result:", JSON.stringify(searchResult, null, 2));

  if (!searchResult.ids || searchResult.ids.length === 0) {
    console.log("\nNo IDs found");
    return;
  }

  console.log(`\nStep 2: Fetch book details for IDs: ${searchResult.ids}\n`);

  const booksResponse = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: BOOKS_BY_IDS_QUERY,
      variables: { ids: searchResult.ids },
    }),
  });

  const booksData = await booksResponse.json();

  if (booksData.errors) {
    console.error("Books query errors:", booksData.errors);
    return;
  }

  console.log("Books result:", JSON.stringify(booksData.data.books, null, 2));
}

testSearchFlow();
