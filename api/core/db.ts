import type { Bundle, BookItem, GoodreadsRating } from "../types";
import { sql, SQL } from "bun";

// Global initialized for connection pooling purposes
const db = new SQL({
  // Required
  // url: "postgres://user:pass@localhost:5432/dbname", // Filled in by .env parameters - https://bun.sh/docs/api/sql#database-environment-variables

  // Optional configuration
  // hostname: "localhost",
  // port: 5432,
  // database: "myapp",
  // username: "dbuser",
  // password: "secretpass",

  // Connection pool settings
  max: 20, // Maximum connections in pool
  idleTimeout: 30, // Close idle connections after 30s
  maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
  connectionTimeout: 30, // Timeout when establishing new connections

  // SSL/TLS options
  tls: true,
  // tls: {
  //   rejectUnauthorized: true,
  //   requestCert: true,
  //   ca: "path/to/ca.pem",
  //   key: "path/to/key.pem",
  //   cert: "path/to/cert.pem",
  //   checkServerIdentity(hostname, cert) {
  //     ...
  //   },
  // },

  // Callbacks
  onconnect: client => {
    console.log("Connected to database");
  },
  onclose: client => {
    console.log("Connection closed");
  },
},
)

/**
 * Persists a single bundle and its associated books to the database
 * @param bundle The bundle data
 * @param booksWithRatings The books with their Goodreads ratings
 * @returns Object containing the inserted bundle ID and book IDs
 */
export async function persistBundle(
  bundle: Bundle,
  booksWithRatings: Array<BookItem & { rating: GoodreadsRating }>
): Promise<{ bundleId: number; bookIds: number[]; }> {
  // Start a transaction to ensure data consistency
  try {
    // Insert the bundle
    const inserted = await sql`
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

    //console.log("successfully inserted bundle to DB: ", inserted);

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
 * @param booksWithRatings The books with their Goodreads ratings
 * @returns Array of inserted book IDs
 */
export async function persistBundleBooks(
  bundleId: number,
  booksWithRatings: Array<BookItem & { rating: GoodreadsRating }>
): Promise<number[]> {
  const bookIds: number[] = [];

  const rowObjectsToInsert: {
    bundle_id: number; name: string; description: string; content_type: string; url: string | null; // Persist the rating as the book URL for now. Only split this if you later want multiple rating systems
    rating_average: number | null; rating_count: number | null; review_count: number | null; created_ts: number; developer: string;
  }[] = [];
  for (const book of booksWithRatings) {
    rowObjectsToInsert.push({
      bundle_id: bundleId,
      name: book.human_name,
      description: book.description_text,
      content_type: book.item_content_type,
      url: book.rating.url || null, // Persist the rating as the book URL for now. Only split this if you later want multiple rating systems
      rating_average: book.rating.ratingValue || null,
      rating_count: book.rating.ratingCount || null,
      review_count: book.rating.reviewCount || null,
      created_ts: Math.floor(Date.now() / 1000),
      developer: book.developers.map(d => d.developer_name).join(","),
    })
  }

  console.log("Starting transaction for book inserts...");
  let bookResults = [];
  
  try {
    // Use a transaction for all book inserts
    const bookResultsArray = await sql.begin(async tx => {
      //console.log("Transaction started");
      const results = [];
      
      for (const row of rowObjectsToInsert) {
        //console.log(`Inserting book: ${row.name}`);
        try {
          const result = await tx`
            INSERT INTO book (
              bundle_id, name, description, content_type, url,
              rating_average, rating_count, review_count, created_ts, developer
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
              ${row.created_ts},
              ${row.developer}
            )
            RETURNING book_id, name
          `;
          //console.log(`Book insert result:`, result);
          results.push(result);
        } catch (err) {
          console.error(`Error inserting book ${row.name}:`, err);
          throw err; // Re-throw to roll back the transaction
        }
      }
      
      //console.log("All book inserts completed successfully");
      return results;
    });
    
    console.log("Transaction completed successfully");
    console.log("Book results array:", bookResultsArray);
    
    // Flatten the results
    bookResults = bookResultsArray.flat();
    //console.log("Flattened book results:", bookResults);
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
