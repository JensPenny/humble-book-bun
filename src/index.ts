import { $ } from "bun";

const HUMBLE_BUNDLE_URL = "https://www.humblebundle.com/books/full-stack-development-with-apress-books";

async function fetchBundlePage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  
  if (!response.ok) throw new Error(`Failed to fetch bundle page: ${response.status}`);
  return await response.text();
}

function extractBookTitles(html: string): string[] {
  let script_tag = "";
  const rewriter = new HTMLRewriter().on("script#webpack-bundle-page-data", {
    text(text){
      script_tag += text.text
    },
  });
  rewriter.transform(html)
  const asJson = JSON.parse(script_tag);
  const tier_item_data = asJson.bundleData.tier_item_data;
  const ebooks = Object.values(tier_item_data);
  const filtered = ebooks.filter((item: any) => item.item_content_type == "ebook");
  const titles = filtered.map((item: any) => item.human_name);
  const developers = filtered.map((item: any) => item.developers);
  console.log(developers);
  console.log(titles);
  
  return titles.sort();
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
    
    console.log(`Found ${books.length} unique books:\n`);
    // Print each book title on a new line with a bullet point
    books.forEach(book => console.log(`• ${book}`));
    
  } catch (error: any) {
    if (error.message.includes('404')) {
      console.error("Error: Bundle not found. The bundle might have expired or the URL might be incorrect.");
    } else {
      console.error("Error:", error?.message || error);
    }
    process.exit(1);
  }
})();
