import { analyzeBundleUrl } from "../core/humble";
import { uploadBundleData } from "../core/db";
import type { D1Database } from "@cloudflare/workers-types";

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
        console.log("\nSaving bundle data to database...");
        
        console.log("\nNote: This is a simulation of database upload. In a real environment, you would connect to D1.");
        
        // Create a mock database for demonstration
        const mockDb = {
          prepare: () => ({
            bind: () => ({
              first: () => ({ bundle_id: 1, book_id: 1, developer_id: 1 }),
              run: () => ({})
            })
          }),
          batch: (statements: any[]) => Promise.resolve([{ results: [{ bundle_id: 1 }] }])
        } as unknown as D1Database;
        
        // Upload bundle data
        const result = await uploadBundleData(mockDb, bundle, booksWithRatings);
        
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
