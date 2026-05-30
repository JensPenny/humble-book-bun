import type { BookItem, BookRating } from "../types";

const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql";

// Hardcover rate limit: 60 requests per minute.
// Each book lookup uses 2 requests (search + books query).
// So we need at least 1 second between *any* two requests to stay under the limit.
const MIN_REQUEST_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

let lastRequestTime = 0;

/**
 * Enforces a minimum delay between Hardcover API calls to respect rate limits.
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch from Hardcover API with rate limiting and exponential backoff on 429.
 */
async function fetchHardcover(body: object): Promise<Response> {
  await rateLimit();

  const token = getApiToken();
  if (!token) {
    throw new Error("HARDCOVER_API_TOKEN not set");
  }

  return fetch(HARDCOVER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Fetch with retry logic for rate-limit (429) responses.
 */
async function fetchWithRetry(body: object, attempt = 1): Promise<Response> {
  const response = await fetchHardcover(body);

  if (response.status === 429) {
    if (attempt > MAX_RETRIES) {
      console.warn(`Hardcover rate limit (429) persisted after ${MAX_RETRIES} retries. Giving up.`);
      return response;
    }

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(`Hardcover rate limited (429). Retrying in ${delay}ms... (attempt ${attempt}/${MAX_RETRIES})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(body, attempt + 1);
  }

  return response;
}

const SEARCH_QUERY = `
query SearchBooks($query: String!, $perPage: Int!) {
  search(query: $query, per_page: $perPage, query_type: "Books") {
    ids
    error
  }
}
`;

const BOOKS_BY_IDS_QUERY = `
query GetBooksByIds($ids: [Int!]!) {
  books(where: { id: { _in: $ids } }, limit: 10) {
    id
    title
    slug
    rating
    ratings_count
    reviews_count
    cached_contributors
  }
}
`;

function getApiToken(): string | undefined {
  return process.env.HARDCOVER_API_TOKEN;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesMatch(queryTitle: string, resultTitle: string): boolean {
  const queryWords = normalizeTitle(queryTitle).split(" ").filter(w => w.length > 2);
  const resultWords = normalizeTitle(resultTitle).split(" ");
  const resultWordSet = new Set(resultWords);

  if (queryWords.length === 0) return true;

  let matches = 0;
  for (const word of queryWords) {
    if (resultWordSet.has(word)) {
      matches++;
    }
  }

  return matches >= Math.max(1, Math.floor(queryWords.length / 2));
}

function authorMatches(book: BookItem, contributors: any[]): boolean {
  if (!book.developers || book.developers.length === 0) return true;
  if (!contributors || contributors.length === 0) return true;

  const queryAuthor = book.developers[0].developer_name.toLowerCase().trim();

  const resultAuthors = contributors
    .map((c: any) => c.author?.name?.toLowerCase().trim())
    .filter(Boolean);

  return resultAuthors.some((author: string) =>
    author.includes(queryAuthor) || queryAuthor.includes(author)
  );
}

export async function getHardcoverRating(
  book: BookItem
): Promise<BookRating> {
  const token = getApiToken();
  if (!token) {
    return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
  }

  try {
    const titleWords = book.human_name.replace(/\n/g, " ").trim();
    const author = book.developers?.[0]?.developer_name || "";
    // Include author in search query for better results
    const searchQuery = author ? `${titleWords} ${author}` : titleWords;

    console.log(`Searching Hardcover for: ${book.human_name}`);

    // Step 1: Search for book IDs
    const searchResponse = await fetchWithRetry({
      query: SEARCH_QUERY,
      variables: { query: searchQuery, perPage: 5 },
    });

    if (!searchResponse.ok) {
      console.error(`Hardcover API error: ${searchResponse.status}`);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    const searchData = await searchResponse.json();

    if (searchData.errors) {
      console.error(`Hardcover GraphQL error:`, searchData.errors[0]?.message);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    const ids = searchData.data?.search?.ids;
    if (!ids || ids.length === 0) {
      console.log(`No Hardcover results found for: ${book.human_name}`);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    // Step 2: Fetch book details by IDs
    const booksResponse = await fetchWithRetry({
      query: BOOKS_BY_IDS_QUERY,
      variables: { ids },
    });

    if (!booksResponse.ok) {
      console.error(`Hardcover API error fetching details: ${booksResponse.status}`);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    const booksData = await booksResponse.json();

    if (booksData.errors) {
      console.error(`Hardcover GraphQL error fetching details:`, booksData.errors[0]?.message);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    const books = booksData.data?.books;
    if (!books || books.length === 0) {
      console.log(`No Hardcover book details found for: ${book.human_name}`);
      return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
    }

    // Find the best matching result
    let bestResult = null;
    for (const result of books) {
      if (titlesMatch(titleWords, result.title) && authorMatches(book, result.cached_contributors || [])) {
        bestResult = result;
        break;
      }
    }

    // If no good match, fall back to the first result that matches title
    if (!bestResult) {
      for (const result of books) {
        if (titlesMatch(titleWords, result.title)) {
          bestResult = result;
          break;
        }
      }
    }

    // If still no match, just take the first result with ratings
    if (!bestResult) {
      bestResult = books.find((b: any) => b.rating && b.ratings_count > 0) || books[0];
      console.warn(`Hardcover: using unvalidated result for "${book.human_name}": "${bestResult.title}"`);
    }

    const url = bestResult.slug ? `https://hardcover.app/books/${bestResult.slug}` : null;
    const ratingValue = bestResult.rating ? parseFloat(bestResult.rating) : null;
    const ratingCount = bestResult.ratings_count ?? null;
    const reviewCount = bestResult.reviews_count ?? null;

    if (ratingValue !== null) {
      console.log(
        `Found rating for "${book.human_name}": ${ratingValue}/5 - ${ratingCount} ratings - ${reviewCount} reviews`
      );
    } else {
      console.log(`Could not extract rating for: ${book.human_name}`);
    }

    return { source: "hardcover", ratingValue, ratingCount, reviewCount, url };
  } catch (error) {
    console.error(`Error getting Hardcover rating for "${book.human_name}":`, error);
    return { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null };
  }
}

export async function getHardcoverRatings(
  books: BookItem[]
): Promise<Array<BookItem & { rating: BookRating }>> {
  if (!getApiToken()) {
    console.warn(
      "Warning: HARDCOVER_API_TOKEN is not set. Set it in your .env.local file."
    );
    console.warn("Get your token from: https://hardcover.app → Account Settings → Hardcover API");
    return books.map((book) => ({
      ...book,
      rating: { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null },
    }));
  }

  const booksWithRatings: Array<BookItem & { rating: BookRating }> = [];
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  for (const book of books) {
    const rating = await getHardcoverRating(book);
    booksWithRatings.push({ ...book, rating });

    if (rating.ratingValue === null && rating.ratingCount === null) {
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `${MAX_CONSECUTIVE_FAILURES} consecutive Hardcover failures. Skipping remaining books. Check your HARDCOVER_API_TOKEN.`
      );
      for (const remainingBook of books.slice(booksWithRatings.length)) {
        booksWithRatings.push({
          ...remainingBook,
          rating: { source: "hardcover", ratingValue: null, ratingCount: null, reviewCount: null, url: null },
        });
      }
      break;
    }
  }

  return booksWithRatings;
}
