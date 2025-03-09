import { analyzeBundleUrl } from "../core/humble";

const DEFAULT_URL = "https://www.humblebundle.com/books/computer-science-fun-way-no-starch-books";

async function main() {
  try {
    const url = process.argv[2] || DEFAULT_URL;
    console.log(`Analyzing bundle at: ${url}`);
    
    const booksWithRatings = await analyzeBundleUrl(url);
    
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
