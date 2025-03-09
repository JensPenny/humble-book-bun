import type { BookItem, GoodreadsRating } from "../types";
import { UnmarshalBookItem } from "../types";
import { getGoodreadsRatings } from "../goodreads";

export async function fetchBundlePage(url: string): Promise<string> {
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

export function extractBookTitles(html: string): BookItem[] {
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

export async function analyzeBundleUrl(url: string): Promise<Array<BookItem & { rating: GoodreadsRating }>> {
  const html = await fetchBundlePage(url);
  const books = extractBookTitles(html);
  
  if (books.length === 0) {
    throw new Error("No books found in the bundle data.");
  }
  
  // Get Goodreads ratings for all books
  const booksWithRatings = await getGoodreadsRatings(books);
  return booksWithRatings;
}
