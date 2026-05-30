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
  console.error("HARDCOVER_API_TOKEN is not set in your .env.local");
  process.exit(1);
}

console.log(`Token found: ${token.substring(0, 8)}...${token.substring(token.length - 4)} (${token.length} chars)`);

const TEST_QUERY = `
query TestQuery {
  books(limit: 1) {
    title
  }
}
`;

async function testAuth(headerName: string, headerValue: string): Promise<void> {
  console.log(`\n--- Testing: ${headerName}: ${headerValue.substring(0, 30)}... ---`);
  
  try {
    const response = await fetch(HARDCOVER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [headerName]: headerValue,
      },
      body: JSON.stringify({ query: TEST_QUERY }),
    });

    console.log(`Status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.errors) {
      console.log(`GraphQL errors:`, data.errors.map((e: any) => e.message));
    } else if (data.data) {
      console.log(`✓ SUCCESS! Response:`, JSON.stringify(data.data, null, 2));
    } else {
      console.log(`Response:`, JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error(`Fetch error:`, err.message);
  }
}

async function main() {
  console.log("Testing Hardcover API authentication formats...\n");
  
  // Test 1: Bearer prefix
  await testAuth("Authorization", `Bearer ${token}`);
  
  // Test 2: Raw token (no Bearer)
  await testAuth("Authorization", token);
  
  // Test 3: x-hasura-admin-secret
  await testAuth("x-hasura-admin-secret", token);
  
  console.log("\n--- Done ---");
}

main();
