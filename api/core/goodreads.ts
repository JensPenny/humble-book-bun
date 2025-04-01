import type { BookItem, GoodreadsRating } from "../types";

/**
 * Scrapes Goodreads to get the rating information for a book
 * @param book The book item to get the rating for
 * @returns A promise that resolves to the rating information
 */
export async function getGoodreadsRating(book: BookItem): Promise<GoodreadsRating> {
  try {
    // Step 1: Search for the book on Goodreads
    const devs = book.developers.map(d => d.developer_name).join(" ");
    const searchUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(book.human_name + " " + devs)}`;
    console.log(`Searching Goodreads for: ${book.human_name}`);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!searchResponse.ok) {
      console.error(`Failed to search Goodreads: ${searchResponse.status}`);
      return { ratingValue: null, ratingCount: null, reviewCount: null, url: searchUrl };
    }
    
    const searchHtml = await searchResponse.text();
    
    // Step 2: Extract the first book result URL
    const bookUrlMatch = searchHtml.match(/href="(\/book\/show\/[^"]+)"/);
    if (!bookUrlMatch) {
      console.log(`No Goodreads results found for: ${book.human_name}`);
      return { ratingValue: null, ratingCount: null, reviewCount: null, url: searchUrl };
    }
    
    const bookRelativeUrl = bookUrlMatch[1];
    const bookUrl = `https://www.goodreads.com${bookRelativeUrl}`;
    console.log(`Found Goodreads page: ${bookUrl}`);
    
    // Step 3: Fetch the book page
    const bookResponse = await fetch(bookUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!bookResponse.ok) {
      console.error(`Failed to fetch book page: ${bookResponse.status}`);
      return { ratingValue: null, ratingCount: null, reviewCount: null, url: bookUrl };
    }
    
    const bookHtml = await bookResponse.text();
    
    // Step 4: Extract the rating using Bun's HTML rewriter
    let ratingValue: number | null = null;
    let ratingCount: number | null = null;
    let reviewCount: number | null = null;
    
    // Use Bun's HTML rewriter to extract the JSON-LD data
    let jsonLdContent = "";
    const rewriter = new HTMLRewriter().on('script[type="application/ld+json"]', {
      text(text) {
        jsonLdContent += text.text;
      }
    });
    
    rewriter.transform(bookHtml);
    
    if (jsonLdContent) {
      try {
        const jsonData = JSON.parse(jsonLdContent);
        if (jsonData.aggregateRating && jsonData.aggregateRating.ratingValue) {
          ratingValue = parseFloat(jsonData.aggregateRating.ratingValue);
        }

        if (jsonData.aggregateRating && jsonData.aggregateRating.ratingCount) {
          ratingCount = parseInt(jsonData.aggregateRating.ratingCount);
        }

        if (jsonData.aggregateRating && jsonData.aggregateRating.reviewCount) {
          reviewCount = parseInt(jsonData.aggregateRating.reviewCount);
        }
      } catch (e) {
        console.error(`Error parsing JSON-LD data: ${e}`);
      }
    }
    
    // If HTML rewriter approach failed, try regex patterns as fallback
    if (ratingValue === null) {
      let ratingMatch = bookHtml.match(/itemprop="ratingValue" content="([0-9.]+)"/);
      
      if (!ratingMatch) {
        ratingMatch = bookHtml.match(/"ratingValue":"([0-9.]+)"/);
      }
      
      if (!ratingMatch) {
        ratingMatch = bookHtml.match(/class="RatingStatistics__rating">([0-9.]+)</);
      }
      
      if (ratingMatch) {
        ratingValue = parseFloat(ratingMatch[1]);
      }
    }
    
    // Try to extract rating count if not found in JSON-LD
    if (ratingCount === null) {
      const ratingCountMatch = bookHtml.match(/data-testid="ratingsCount"[^>]*>(\d+)/);
      if (ratingCountMatch) {
        ratingCount = parseInt(ratingCountMatch[1]);
      }
    }
    
    // Try to extract review count if not found in JSON-LD
    if (reviewCount === null) {
      const reviewCountMatch = bookHtml.match(/data-testid="reviewsCount"[^>]*>(\d+)/);
      if (reviewCountMatch) {
        reviewCount = parseInt(reviewCountMatch[1]);
      }
    }
    
    const rating: GoodreadsRating = {
      ratingValue,
      ratingCount,
      reviewCount, 
      url: bookUrl,
    };
    
    if (ratingValue !== null) {
      console.log(`Found rating for "${book.human_name}": ${ratingValue}/5 - ${ratingCount} ratings - ${reviewCount} reviews`);
    } else {
      console.log(`Could not extract rating for: ${book.human_name}`);
    }
    
    return rating;
  } catch (error) {
    console.error(`Error getting Goodreads rating for "${book.human_name}":`, error);
    return { ratingValue: null, ratingCount: null, reviewCount: null, url: null };
  }
}

/**
 * Gets Goodreads ratings for a list of books
 * @param books The list of books to get ratings for
 * @returns A promise that resolves to an array of books with their ratings
 */
export async function getGoodreadsRatings(books: BookItem[]): Promise<Array<BookItem & { rating: GoodreadsRating }>> {
  const booksWithRatings = [];
  
  for (const book of books) {
    const rating = await getGoodreadsRating(book);
    booksWithRatings.push({
      ...book,
      rating
    });
    
    // Add a small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return booksWithRatings;
}
