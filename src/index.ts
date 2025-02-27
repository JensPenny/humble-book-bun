import type { BookItem, GoodreadsRating } from "./types";
import { UnmarshalBookItem } from "./types";
import { getGoodreadsRatings } from "./goodreads";


const HUMBLE_BUNDLE_URL = "https://www.humblebundle.com/books/ultimate-cybersecurity-career-packt-books";
// const HUMBLE_BUNDLE_URL = "https://www.humblebundle.com/books/linux-from-beginner-to-professional-oreilly-books";
//const HUMBLE_BUNDLE_URL = "https://www.humblebundle.com/books/full-stack-development-with-apress-books";

async function fetchBundlePage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'humble-bundle-bun',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  
  if (!response.ok) throw new Error(`Failed to fetch bundle page: ${response.status}`);
  return await response.text();
}

function extractBookTitles(html: string): BookItem[] {
  let script_tag = "";
  const rewriter = new HTMLRewriter().on("script#webpack-bundle-page-data", {
    text(text){
      script_tag += text.text
    },
  });
  rewriter.transform(html)
  const asJson = JSON.parse(script_tag);
  const tier_item_data = asJson.bundleData.tier_item_data;
  const books: BookItem[] = Object.values(tier_item_data).map(UnmarshalBookItem);
  const filtered = books.filter(book => book.item_content_type === "ebook");
  return filtered.sort((a, b) => a.human_name.localeCompare(b.human_name));
}

(async () => {
  try {
    console.log("Fetching bundle page...");
    const html = await fetchBundlePage(HUMBLE_BUNDLE_URL);
    
    console.log("Extracting book titles...");
    await Bun.write("test.txt", html);
    const books = extractBookTitles(html);
    
    if (books.length === 0) {
      console.log("No books found in the bundle data.");
      process.exit(1);
    }
    
    console.log(`Found ${books.length} unique books. Fetching Goodreads ratings...\n`);
    
    // Get Goodreads ratings for all books
    const booksWithRatings = await getGoodreadsRatings(books);
    
    // Print each book title, authors, and rating information on a new line with a bullet point
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
})();
