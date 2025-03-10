import type { Bundle, BookItem, GoodreadsRating } from "./types";
import type { D1Database, D1PreparedStatement, D1Result } from "@cloudflare/workers-types";

/**
 * Uploads a single bundle and its associated books to the D1 database
 * @param db The D1 database instance
 * @param bundle The bundle data
 * @param booksWithRatings The books with their Goodreads ratings
 * @returns Object containing the inserted bundle ID and book IDs
 */
export async function uploadBundleData(
  db: D1Database,
  bundle: Bundle,
  booksWithRatings: Array<BookItem & { rating: GoodreadsRating }>
) {
  // Start a transaction to ensure data consistency
  return await db.batch([
    // First, insert the bundle
    db.prepare(
      `INSERT INTO bundle (name, type, url, start_bundle, end_bundle, created_ts)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING bundle_id`
    ).bind(
      bundle.name,
      bundle.type,
      bundle.url,
      Math.floor(bundle.start_bundle.getTime() / 1000), // Convert to Unix timestamp
      Math.floor(bundle.end_bundle.getTime() / 1000),   // Convert to Unix timestamp
      Math.floor(Date.now() / 1000)                     // Current timestamp
    ),
  ]).then(async (results: any) => {
    // Get the inserted bundle ID
    const bundleId = results[0].results[0].bundle_id as number;
    
    // Now insert all the books and their developers
    const bookIds = await uploadBooksData(db, bundleId, booksWithRatings);
    
    return {
      bundleId,
      bookIds
    };
  });
}

/**
 * Uploads multiple books and their developers to the D1 database
 * @param db The D1 database instance
 * @param bundleId The ID of the bundle these books belong to
 * @param booksWithRatings The books with their Goodreads ratings
 * @returns Array of inserted book IDs
 */
export async function uploadBooksData(
  db: D1Database,
  bundleId: number,
  booksWithRatings: Array<BookItem & { rating: GoodreadsRating }>
): Promise<number[]> {
  const bookIds: number[] = [];

  const statements: D1PreparedStatement[] = [];
  for (const book of booksWithRatings){
    const statement = db.prepare(
      `INSERT INTO book (
        bundle_id, name, description, content_type, url,
        rating_average, rating_count, review_count, created_ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING book_id, name`
    ).bind(
      bundleId,
      book.human_name,
      book.description_text,
      book.item_content_type,
      book.rating.url || null, // Persist the rating as the book URL for now. Only split this if you later want multiple rating systems
      book.rating.ratingValue || null,
      book.rating.ratingCount || null,
      book.rating.reviewCount || null,
      Math.floor(Date.now() / 1000),
    );

    statements.push(statement);
  }

  //Do the actual database call
  const bookResults = await db.batch(statements);
  if (!bookResults) {
    throw new Error(`Could not get to D1 to batch create the books information`);
  }

  // Logging for the books based on the D1Results that we get back
  for (const d1_result of bookResults) {
    console.log(d1_result.success + ": " + d1_result.meta); // Console.log the full success and meta line 
    
    // Since we only always do single inserts, we just take the first result
    const first = d1_result.results[0] as {book_id: number, name: string} // Typed as a return tuple. See the insert statement for details
    console.log(`Persisted ${first.book_id} - ${first.name}`);

    // Append to the list of persisted book-ids. Mostly if we want to do stuff here later
    bookIds.push(first.book_id);
  }
  
  return bookIds;
}

class CloudflareD1Client {
  private url: string;
  private headers: HeadersInit;

  constructor(accountId: string, apiToken: string) {
    this.url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${DATABASE_ID}`
    this.headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async executeSingle(query: string, params: any[] = []): Promise<D1Result> {
    const response = await fetch(`${this.url}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sql: query,
        params: params
      })
    });

    if (!response.ok) {
      const err_text = await response.text();
      throw new Error(`Could not connect to the cloudflare API: ${response.status} - ${err_text}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return data.result as D1Result; // The format for the API is the same as a D1 Result - lets hope it stays that way
  }

  async executeBatch(queries: { sql: string, params: any[] }[]): Promise<D1Result[]> {
    // Step 1 - Convert each query object to a raw SQL string with parameters substituted
    const processedQueries = queries.map(query => {
      let sql = query.sql;
      const params = query.params || [];
      
      // Replace each ? placeholder with the corresponding parameter value
      // This is a simplified approach
      params.forEach((param, index) => {
        let paramValue: string;
        
        if (param === null) {
          paramValue = 'NULL';
        } else if (typeof param === 'string') {
          // Escape single quotes in strings
          paramValue = `'${param.replace(/'/g, "''")}'`;
        } else if (typeof param === 'number' || typeof param === 'boolean') {
          paramValue = param.toString();
        } else if (param instanceof Date) {
          paramValue = `'${param.toISOString()}'`;
        } else {
          // For objects or arrays, convert to JSON string
          paramValue = `'${JSON.stringify(param).replace(/'/g, "''")}'`;
        }
        
        // Replace the first occurrence of ? with the parameter value
        sql = sql.replace('?', paramValue);
      });
      
      return sql;
    });
    
    // Step 2 - Join all SQL statements with semicolons
    const combinedSql = processedQueries.join('; ');
    
    // Step 3 - Make the API request with the combined SQL
    const response = await fetch(`${this.url}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sql: combinedSql
      })
    });
    
    if (!response.ok) {
      const err_text = await response.text();
      throw new Error(`Could not connect to the cloudflare API for batch operation: ${response.status} - ${err_text}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
    
    // The API returns results for each statement in the batch
    return data.result as D1Result[];
  }
}
