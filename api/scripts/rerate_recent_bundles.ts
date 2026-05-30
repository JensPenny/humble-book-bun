import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { SQL } from "bun";
import { getUnifiedRating } from "../core/unified-ratings";
import type { BookItem } from "../types";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded env from: ${envPath}`);
} else {
  dotenv.config();
  console.log("Loaded env from default location");
}

const daysArg = process.argv.indexOf("--days");
const days = daysArg !== -1 ? parseInt(process.argv[daysArg + 1]) : 30;

function logConnectionDebug(): void {
  console.log("\n--- Database Connection Debug ---");
  console.log(`PGHOST: ${process.env.PGHOST || "(not set)"}`);
  console.log(`PGPORT: ${process.env.PGPORT || "(not set)"}`);
  console.log(`PGDATABASE: ${process.env.PGDATABASE || "(not set)"}`);
  console.log(`PGUSER: ${process.env.PGUSER || "(not set)"}`);
  console.log(
    `PGPASSWORD: ${process.env.PGPASSWORD ? "***REDACTED***" : "(not set)"}`
  );
  console.log(`PGURL: ${process.env.PGURL || "(not set)"}`);
  console.log("---------------------------------\n");
}

function createDbPool(): SQL {
  // For local dev, disable TLS if PG_TLS is not set to "true"
  // For remote/production, set PG_TLS=true in your .env
  const useTls = process.env.PG_TLS === "true";

  const config: any = {
    max: 5,
    idleTimeout: 30,
    connectionTimeout: 30,
    maxLifetime: 0,

    onconnect: (client: any) => {
      console.log("✓ Connected to database");
    },
    onclose: (client: any) => {
      console.log("Connection closed");
    },
  };

  if (useTls) {
    config.tls = true;
    console.log("TLS enabled for database connection");
  } else {
    console.log("TLS disabled for database connection (set PG_TLS=true to enable)");
  }

  return new SQL(config);
}

async function testConnection(db: SQL): Promise<void> {
  console.log("Testing database connection...");
  try {
    const result = await db`SELECT 1 as test`;
    console.log(`✓ Connection test passed: ${result[0].test}`);
  } catch (err: any) {
    console.error("✗ Connection test failed:", err.message);
    throw err;
  }
}

async function main() {
  logConnectionDebug();

  const db = createDbPool();

  try {
    await testConnection(db);
  } catch (err) {
    console.error("\nTroubleshooting tips:");
    console.error("1. Check that Postgres is running and accessible");
    console.error("2. Verify PGHOST/PGPORT point to the right server");
    console.error("3. For local Postgres without SSL, make sure PG_TLS is not set to 'true'");
    console.error("4. Check that PGUSER/PGPASSWORD are correct");
    console.error("5. Try connecting manually: psql -h $PGHOST -U $PGUSER -d $PGDATABASE");
    throw err;
  }

  console.log(`Fetching books from bundles created in the last ${days} days...`);

  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

  const books = await db`
    SELECT b.book_id, b.name, b.developer, b.url, b.rating_average
    FROM book b
    JOIN bundle bu ON b.bundle_id = bu.bundle_id
    WHERE bu.created_ts > ${cutoff}
    ORDER BY b.book_id
  `;

  console.log(`Found ${books.length} books to re-rate.`);

  let updated = 0;
  let skipped = 0;

  for (const row of books) {
    const bookItem: BookItem = {
      human_name: row.name,
      description_text: "",
      item_content_type: "ebook",
      developers: row.developer
        ? row.developer
            .split(",")
            .map((d: string) => ({ developer_name: d.trim() }))
        : [],
    };

    const rating = await getUnifiedRating(bookItem);

    if (rating.ratingValue !== null) {
      await db`
        UPDATE book
        SET url = ${rating.url},
            rating_average = ${rating.ratingValue},
            rating_count = ${rating.ratingCount},
            review_count = ${rating.reviewCount},
            rating_source = ${rating.source}
        WHERE book_id = ${row.book_id}
      `;
      updated++;
    } else {
      skipped++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\nDone.`);
  console.log(`  Updated: ${updated}`);
  console.log(`  No result from any source: ${skipped}`);
  console.log(`  Total: ${books.length}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
