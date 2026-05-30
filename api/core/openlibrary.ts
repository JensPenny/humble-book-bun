import type { BookItem, BookRating } from "../types";

const OPENLIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPENLIBRARY_RATINGS_URL = "https://openlibrary.org/works";

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

  // At least half of the significant query words should appear in the result
  let matches = 0;
  for (const word of queryWords) {
    if (resultWordSet.has(word)) {
      matches++;
    }
  }

  return matches >= Math.max(1, Math.floor(queryWords.length / 2));
}

function authorMatches(book: BookItem, doc: any): boolean {
  if (!book.developers || book.developers.length === 0) return true;
  if (!doc.author_name || doc.author_name.length === 0) return true;

  const queryAuthor = book.developers[0].developer_name.toLowerCase().trim();
  const resultAuthors = doc.author_name.map((a: string) => a.toLowerCase().trim());

  // Check if any result author contains the query author or vice versa
  return resultAuthors.some((author: string) =>
    author.includes(queryAuthor) || queryAuthor.includes(author)
  );
}

export async function getOpenLibraryRating(
  book: BookItem
): Promise<BookRating> {
  try {
    const titleWords = book.human_name.replace(/\n/g, " ").trim();
    const author = book.developers?.[0]?.developer_name || "";

    console.log(`Searching OpenLibrary for: ${book.human_name}`);

    // Build search query: prioritize title + author
    const searchQuery = author
      ? `${titleWords} author:${author}`
      : titleWords;

    const searchUrl = `${OPENLIBRARY_SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&limit=5&fields=key,title,author_name,ratings_average,ratings_count,first_publish_year`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "humble-bundle-bun (contact@example.com)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`OpenLibrary API error: ${response.status}`);
      return nullRating();
    }

    const data = await response.json();
    const docs = data.docs;

    if (!docs || docs.length === 0) {
      console.log(`No OpenLibrary results found for: ${book.human_name}`);
      return nullRating();
    }

    // Find the best matching result
    let bestDoc = null;
    for (const doc of docs) {
      if (titlesMatch(titleWords, doc.title) && authorMatches(book, doc)) {
        bestDoc = doc;
        break;
      }
    }

    // If no good match, fall back to the first result that matches title
    if (!bestDoc) {
      for (const doc of docs) {
        if (titlesMatch(titleWords, doc.title)) {
          bestDoc = doc;
          break;
        }
      }
    }

    // If still no match, just take the first result (but note it's unvalidated)
    if (!bestDoc) {
      bestDoc = docs[0];
      console.warn(`OpenLibrary: using unvalidated result for "${book.human_name}": "${bestDoc.title}"`);
    }

    const ratingValue = bestDoc.ratings_average
      ? parseFloat(bestDoc.ratings_average)
      : null;
    const ratingCount = bestDoc.ratings_count ?? null;
    const url = bestDoc.key
      ? `https://openlibrary.org${bestDoc.key}`
      : null;

    if (ratingValue !== null) {
      console.log(
        `Found OpenLibrary rating for "${book.human_name}": ${ratingValue}/5 - ${ratingCount} ratings`
      );
    } else {
      console.log(`No rating available on OpenLibrary for: ${book.human_name}`);
    }

    return {
      source: "openlibrary",
      ratingValue,
      ratingCount,
      reviewCount: null, // OpenLibrary doesn't expose review count in search API
      url,
    };
  } catch (error) {
    console.error(
      `Error getting OpenLibrary rating for "${book.human_name}":`,
      error
    );
    return nullRating();
  }
}

function nullRating(): BookRating {
  return {
    source: "openlibrary",
    ratingValue: null,
    ratingCount: null,
    reviewCount: null,
    url: null,
  };
}

export async function getOpenLibraryRatings(
  books: BookItem[]
): Promise<Array<BookItem & { rating: BookRating }>> {
  const booksWithRatings: Array<BookItem & { rating: BookRating }> = [];
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  for (const book of books) {
    const rating = await getOpenLibraryRating(book);
    booksWithRatings.push({ ...book, rating });

    if (rating.ratingValue === null && rating.ratingCount === null) {
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `${MAX_CONSECUTIVE_FAILURES} consecutive OpenLibrary failures. Skipping remaining books.`
      );
      for (const remainingBook of books.slice(booksWithRatings.length)) {
        booksWithRatings.push({
          ...remainingBook,
          rating: nullRating(),
        });
      }
      break;
    }

    // Be nice to the free API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return booksWithRatings;
}
