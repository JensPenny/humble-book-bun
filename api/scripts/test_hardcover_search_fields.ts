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

const INTROSPECTION_QUERY = `
query {
  __type(name: "search_output") {
    fields {
      name
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
}
`;

async function main() {
  console.log("Introspecting search_output type...\n");

  const response = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });

  const data = await response.json();

  if (data.errors) {
    console.error("Errors:", data.errors);
    return;
  }

  console.log("Fields on search_output:");
  const fields = data.data?.__type?.fields || [];
  for (const field of fields) {
    console.log(`  - ${field.name}: ${field.type.name || field.type.kind}`);
  }
}

main();
