import type { BookItem, GoodreadsRating, Bundle } from "../types";
import { UnmarshalBookItem } from "../types";
import { getGoodreadsRatings } from "./goodreads";

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

export function extractBundleData(html: string): { bundle: Bundle, books: BookItem[] } {
  let script_tag = "";
  const rewriter = new HTMLRewriter().on("script#webpack-bundle-page-data", {
    text(text){
      script_tag += text.text
    },
  });
  rewriter.transform(html)
  const asJson = JSON.parse(script_tag);
  const tier_item_data = asJson.bundleData.tier_item_data;
  
  const bundle: Bundle = {
    name: asJson.bundleData.basic_data.human_name, 
    author: asJson.bundleData.author,
    type: asJson.bundleData.basic_data.media_type,
    url: asJson.bundleData.page_url, 
    start_bundle: new Date(asJson.bundleData["at_time|datetime"]), 
    end_bundle: new Date(asJson.bundleData.basic_data["end_time|datetime"]),
  }

  const books: BookItem[] = Object.values(tier_item_data).map(UnmarshalBookItem);
  const filtered = books.filter(book => book.item_content_type === "ebook");
  const sortedBooks = filtered.sort((a, b) => a.human_name.localeCompare(b.human_name));
  
  return {
    bundle,
    books: sortedBooks
  };
}

export async function analyzeBundleUrl(url: string): Promise<{ bundle: Bundle, books: Array<BookItem & { rating: GoodreadsRating }> }> {
  const html = await fetchBundlePage(url);
  const { bundle, books } = extractBundleData(html);
  
  if (books.length === 0) {
    throw new Error("No books found in the bundle data.");
  }
  
  // Get Goodreads ratings for all books
  const booksWithRatings = await getGoodreadsRatings(books);
  
  return {
    bundle,
    books: booksWithRatings
  };
}
