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

const SCHEMA_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType {
      name
      fields {
        name
        description
        args {
          name
          type {
            name
            inputFields {
              name
              type {
                name
              }
            }
          }
        }
        type {
          name
        }
      }
    }
  }
}
`;

async function fetchGraphQL(query: string, variables?: any): Promise<any> {
  const response = await fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  return await response.json();
}

async function main() {
  console.log("Fetching Hardcover schema...\n");

  const data = await fetchGraphQL(SCHEMA_QUERY);

  if (data.errors) {
    console.error("GraphQL errors:", data.errors);
    return;
  }

  const queryFields = data.data.__schema.queryType.fields;

  console.log(`Available top-level queries (${queryFields.length} total):`);
  console.log("=".repeat(60));

  for (const field of queryFields) {
    console.log(`\n→ ${field.name}`);
    if (field.description) {
      console.log(`  Description: ${field.description.substring(0, 100)}...`);
    }

    if (field.args && field.args.length > 0) {
      console.log(`  Arguments:`);
      for (const arg of field.args) {
        const inputFields = arg.type?.inputFields;
        if (inputFields && inputFields.length > 0) {
          console.log(`    ${arg.name}: ${arg.type.name}`);
          for (const input of inputFields.slice(0, 10)) {
            console.log(`      - ${input.name}: ${input.type?.name || "?"}`);
          }
          if (inputFields.length > 10) {
            console.log(`      ... and ${inputFields.length - 10} more`);
          }
        } else {
          console.log(`    ${arg.name}: ${arg.type?.name || "?"}`);
        }
      }
    }
  }

  // Find search-related queries
  const searchFields = queryFields.filter((f: any) =>
    f.name.toLowerCase().includes("search") ||
    f.name.toLowerCase().includes("book")
  );

  console.log("\n\nSearch/Book related queries:");
  console.log("=".repeat(60));
  for (const field of searchFields) {
    console.log(`  - ${field.name}`);
  }
}

main();
