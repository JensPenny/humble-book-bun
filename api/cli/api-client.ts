#!/usr/bin/env node
import { analyzeBundleUrl } from "../core/humble";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { persistBundle } from "../db";

// Load environment variables from .env.local file
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env.local file not found at ${envPath}`);
  dotenv.config(); // Try to load from default .env file
}

const DEFAULT_URL = "https://www.humblebundle.com/books/computer-science-fun-way-no-starch-books";

async function main() {
  try {
    const url = process.argv[2] || DEFAULT_URL;
    const saveToDb = process.argv.includes('--save');
    
    console.log(`Analyzing bundle at: ${url}`);
    
    const { bundle, books: booksWithRatings } = await analyzeBundleUrl(url);
    
    console.log(`Found ${booksWithRatings.length} unique books with ratings:\n`);
    
    // Print each book title, authors, and rating information
    booksWithRatings.forEach(book => {
      let ratingText = 'No rating found';
      if (book.rating.ratingValue) {
        ratingText = `${book.rating.ratingValue}/5`;
        if (book.rating.ratingCount) {
          ratingText += ` (${book.rating.ratingCount} ratings`;
          if (book.rating.reviewCount) {
            ratingText += `, ${book.rating.reviewCount} reviews`;
          }
          ratingText += ')';
        }
      }
      console.log(`• ${book.human_name} by ${book.developers.map(dev => dev.developer_name).join(", ")} - Goodreads: ${ratingText}`);
    });
    
    // Save to database if --save flag is provided
    if (saveToDb) {
      try {
        console.log("\nSaving bundle data to postgres...");
                
        // Upload bundle data
        const result = await persistBundle(bundle, booksWithRatings);
        
        console.log(`Successfully saved bundle "${bundle.name}" to database.`);
        console.log(`Bundle ID: ${result.bundleId}`);
        console.log(`Books saved: ${result.bookIds.length}`);
      } catch (dbError: any) {
        console.error("Error saving to database:", dbError?.message || dbError);
      }
    } else {
      console.log("\nTip: Run with --save flag to save this data to the database.");
    }

  } catch (error: any) {
    if (error.message.includes('404')) {
      console.error("Error: Bundle not found. The bundle might have expired or the URL might be incorrect.");
    } else {
      console.error("Error:", error?.message || error);
    }
    process.exit(1);
  }
}

main();
