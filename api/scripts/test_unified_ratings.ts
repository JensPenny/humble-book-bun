import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { getUnifiedRating } from "../core/unified-ratings";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const TEST_BOOKS = [
  {
    human_name: "Dune",
    description_text: "",
    item_content_type: "ebook",
    developers: [{ developer_name: "Frank Herbert" }],
  },
  {
    human_name: "The Pragmatic Programmer",
    description_text: "",
    item_content_type: "ebook",
    developers: [{ developer_name: "Andrew Hunt" }],
  },
  {
    human_name: "Nonexistent Book XYZ123",
    description_text: "",
    item_content_type: "ebook",
    developers: [],
  },
];

async function main() {
  console.log("Testing unified ratings fetcher...\n");

  for (const book of TEST_BOOKS) {
    console.log(`\n--- Testing: ${book.human_name} ---`);
    const rating = await getUnifiedRating(book);
    console.log(`Result: ${JSON.stringify(rating, null, 2)}`);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
