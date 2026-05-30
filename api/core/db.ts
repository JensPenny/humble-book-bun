import type { Bundle, BookItem, BookRating } from "../types";
import { SQL } from "bun";

// Global initialized for connection pooling purposes
const db = createDbPool();

function createDbPool(): SQL {
  // For local dev, disable TLS if PG_TLS is not set to "true"
  // For remote/production, set PG_TLS=true in your .env
  const useTls = process.env.PG_TLS === "true";

  const config: any = {
    max: 20, // Maximum connections in pool
    idleTimeout: 30, // Close idle connections after 30s
    maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
    connectionTimeout: 30, // Timeout when establishing new connections

    onconnect: (client: any) => {
      console.log("Connected to database");
    },
    onclose: (client: any) => {
      console.log("Connection closed");
    },
  };

  if (useTls) {
    config.tls = true;
  }

  return new SQL(config);
}

/**
 * Persists a single bundle and its associated books to the database
 * @param bundle The bundle data
 * @param booksWithRatings The books with their ratings
 * @returns Object containing the inserted bundle ID and book IDs
 */
export async function persistBundle(
  bundle: Bundle,
  booksWithRatings: Array<BookItem & { rating: BookRating }>
): Promise<{ bundleId: number; bookIds: number[]; }> {
  // Start a transaction to ensure data consistency
  try {
    // Insert the bundle
    const inserted = await db`
    INSERT INTO bundle (name, type, url, start_bundle, end_bundle, created_ts)
    VALUES (
      ${bundle.name}, 
      ${bundle.type}, 
      ${bundle.url}, 
      ${Math.floor(bundle.start_bundle.getTime() / 1000)}, 
      ${Math.floor(bundle.end_bundle.getTime() / 1000)}, 
      ${Math.floor(Date.now() / 1000)}
    )
    RETURNING bundle_id
    `;

    const bundleId = inserted[0].bundle_id as number;

    // Insert the books
    try {
      const bookIds = await persistBundleBooks(bundleId, booksWithRatings);
      return {
        bundleId: bundleId,
        bookIds: bookIds,
      };
    } catch (err) {
      console.error(`Could not persist bundle books: ${err}`);
      throw err; // Re-throw to propagate the error
    }
  } catch (err) {
    console.error(`Could not persist bundle: ${err}`);
    throw err; // Re-throw to propagate the error
  }
}

/**
 * Persists multiple books and their developers to the database
 * @param bundleId The ID of the bundle these books belong to
 * @param booksWithRatings The books with their ratings
 * @returns Array of inserted book IDs
 */
export async function persistBundleBooks(
  bundleId: number,
  booksWithRatings: Array<BookItem & { rating: BookRating }>
): Promise<number[]> {
  const bookIds: number[] = [];

  const rowObjectsToInsert: {
    bundle_id: number; name: string; description: string; content_type: string; url: string | null;
    rating_average: number | null; rating_count: number | null; review_count: number | null; rating_source: string | null; created_ts: number; developer: string;
  }[] = [];
  for (const book of booksWithRatings) {
    rowObjectsToInsert.push({
      bundle_id: bundleId,
      name: book.human_name,
      description: book.description_text,
      content_type: book.item_content_type,
      url: book.rating.url || null,
      rating_average: book.rating.ratingValue || null,
      rating_count: book.rating.ratingCount || null,
      review_count: book.rating.reviewCount || null,
      rating_source: book.rating.source || null,
      created_ts: Math.floor(Date.now() / 1000),
      developer: book.developers.map(d => d.developer_name).join(","),
    })
  }

  console.log("Starting transaction for book inserts...");
  let bookResults = [];
  
  try {
    // Use a transaction for all book inserts
    const bookResultsArray = await db.begin(async tx => {
      const results = [];
      
      for (const row of rowObjectsToInsert) {
        try {
          const result = await tx`
            INSERT INTO book (
              bundle_id, name, description, content_type, url,
              rating_average, rating_count, review_count, rating_source, created_ts, developer
            )
            VALUES (
              ${row.bundle_id},
              ${row.name},
              ${row.description},
              ${row.content_type},
              ${row.url},
              ${row.rating_average},
              ${row.rating_count},
              ${row.review_count},
              ${row.rating_source},
              ${row.created_ts},
              ${row.developer}
            )
            RETURNING book_id, name
          `;
          results.push(result);
        } catch (err) {
          console.error(`Error inserting book ${row.name}:`, err);
          throw err; // Re-throw to roll back the transaction
        }
      }
      
      return results;
    });
    
    console.log("Transaction completed successfully");
    console.log("Book results array:", bookResultsArray);
    
    // Flatten the results
    bookResults = bookResultsArray.flat();
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err;
  }

  if (bookResults.length === 0) {
    throw new Error(`Could not persist books in the DB`);
  }

  // Process the results and collect book IDs
  for (const book of bookResults) {
    console.log(`Persisted ${book.book_id} - ${book.name}`);
    bookIds.push(book.book_id);
  }

  return bookIds;
}
