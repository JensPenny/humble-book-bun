import type { BookItem, BookRating } from "../types";
import { getHardcoverRating } from "./hardcover";
import { getOpenLibraryRating } from "./openlibrary";
import { getGoodreadsRating } from "./goodreads";

const SOURCES = ["hardcover", "openlibrary", "goodreads"] as const;
type SourceName = (typeof SOURCES)[number];

interface SourceConfig {
  name: SourceName;
  enabled: boolean;
  priority: number;
}

function getSourcePriority(): SourceConfig[] {
  const envPriority = process.env.RATING_SOURCE_PRIORITY;

  if (envPriority) {
    const names = envPriority.split(",").map((s) => s.trim().toLowerCase()) as SourceName[];
    return names
      .filter((name) => SOURCES.includes(name))
      .map((name, index) => ({ name, enabled: true, priority: index }));
  }

  // Default: try hardcover first, then openlibrary, then goodreads as last resort
  return [
    { name: "hardcover", enabled: !!process.env.HARDCOVER_API_TOKEN, priority: 0 },
    { name: "openlibrary", enabled: true, priority: 1 },
    { name: "goodreads", enabled: !!process.env.GOODREADS_COOKIE, priority: 2 },
  ];
}

function getRatingFetcher(source: SourceName) {
  switch (source) {
    case "hardcover":
      return getHardcoverRating;
    case "openlibrary":
      return getOpenLibraryRating;
    case "goodreads":
      return getGoodreadsRating;
  }
}

export async function getUnifiedRating(book: BookItem): Promise<BookRating> {
  const sources = getSourcePriority()
    .filter((s) => s.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (sources.length === 0) {
    console.warn("No rating sources are enabled. Set HARDCOVER_API_TOKEN or GOODREADS_COOKIE.");
    return {
      source: "goodreads",
      ratingValue: null,
      ratingCount: null,
      reviewCount: null,
      url: null,
    };
  }

  for (const sourceConfig of sources) {
    const fetcher = getRatingFetcher(sourceConfig.name);
    const rating = await fetcher(book);

    // If we got a rating value, return it
    if (rating.ratingValue !== null) {
      return rating;
    }

    // If we got a rating count but no value (rare), still consider it a partial success
    if (rating.ratingCount !== null) {
      return rating;
    }

    // Otherwise, try the next source
    console.log(`${sourceConfig.name} had no result for "${book.human_name}", trying next source...`);
  }

  // None of the sources returned a rating
  console.log(`No rating found for "${book.human_name}" from any source.`);
  return {
    source: sources[sources.length - 1]?.name || "goodreads",
    ratingValue: null,
    ratingCount: null,
    reviewCount: null,
    url: null,
  };
}

export async function getUnifiedRatings(
  books: BookItem[]
): Promise<Array<BookItem & { rating: BookRating }>> {
  const booksWithRatings: Array<BookItem & { rating: BookRating }> = [];

  for (const book of books) {
    const rating = await getUnifiedRating(book);
    booksWithRatings.push({ ...book, rating });

    // Small delay to be polite to APIs (Hardcover enforces its own stricter rate limit)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return booksWithRatings;
}
