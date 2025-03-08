# Design document for HumbleBun

This document will list the structure of this full project.
The database scheme will be documented here as well.

## Project structure

This project will have a couple of systems:

1. A definition of a SQL database scheme that will contain the information about the humble book bundles.
2. A script that can fetch this data based on an URL of a book bundle. 
3. A front-end site that can fetch this information.

Deployment-wise, the current plan is the following:

1. Create the tables in cloudflare D1 (or in a local postgres).
2. Adapt the script so that it can add rows in the cloudflare / SQL database, whichever one we use.
3. Change the front-end so that it can read from the SQL database. 

## Database scheme

The initial focus is only on the book bundles.
The basic SQL will contain the following table schemes: 

1. `bundle`: The bundle table with the generic information of the bundle itself
2. `book`: A single book in a book bundle
3. `developer`: Authors/developers of books
4. `book_developer`: Junction table linking books to their authors/developers

### SQL
For the actual SQL, see [the create statements](../db/create_database.sql).

```sql
-- Bundle table: Stores information about Humble Bundles
CREATE TABLE bundle (
    bundle_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL, 
    type TEXT, 
    url TEXT NOT NULL,
    start_bundle INTEGER, -- Start timestamp of the bundle
    end_bundle INTEGER,   -- End timestamp of the bundle
    created_ts INTEGER NOT NULL -- When this record was created
);

-- Indexes for bundle table
CREATE INDEX i_bundle_name ON bundle(name);
CREATE INDEX i_bundle_type ON bundle(type);
CREATE INDEX i_bundle_start ON bundle(start_bundle);
CREATE INDEX i_bundle_end ON bundle(end_bundle);

-- Book table: Stores information about individual books in bundles
CREATE TABLE book (
    book_id INTEGER PRIMARY KEY, 
    bundle_id INTEGER NOT NULL, 
    name TEXT NOT NULL, 
    description TEXT,      -- Book description
    content_type TEXT,     -- Type of content (e.g., "ebook")
    url TEXT, 
    rating_average REAL,   -- Average Goodreads rating
    rating_count INTEGER,  -- Number of ratings on Goodreads
    review_count INTEGER,  -- Number of reviews on Goodreads
    created_ts INTEGER NOT NULL, -- When this record was created
    FOREIGN KEY(bundle_id) REFERENCES bundle(bundle_id) ON DELETE CASCADE
);

-- Indexes for book table
CREATE INDEX i_book_bundle_id ON book(bundle_id);
CREATE INDEX i_book_name ON book(name);

-- Developer table: Stores information about book authors/developers
CREATE TABLE developer (
    developer_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE -- Author/developer name
);

-- Index for developer table
CREATE INDEX i_developer_name ON developer(name);

-- Book-Developer junction table: Links books to their authors/developers
CREATE TABLE book_developer (
    book_id INTEGER,
    developer_id INTEGER,
    PRIMARY KEY (book_id, developer_id),
    FOREIGN KEY(book_id) REFERENCES book(book_id) ON DELETE CASCADE,
    FOREIGN KEY(developer_id) REFERENCES developer(developer_id) ON DELETE CASCADE
);
```

### Notes on Implementation

1. **Timestamps**: All timestamp fields use INTEGER type to store Unix epoch time (seconds since January 1, 1970). This is compatible with Cloudflare D1 and SQLite.

2. **Historical Data**: The schema supports keeping historical data by creating new records for each bundle and book scan. You can query for the most recent data using the `created_ts` field.

3. **Expandability**: The `type` field in the `bundle` table allows for future expansion to other types of bundles beyond books.

4. **Normalization**: The developer/author information is properly normalized with a many-to-many relationship between books and developers.

### Commands to create a test database

These commands assume that you are in the same folder as the `create_database.sql` file and the `insert_testdata.sql` file.

``` sh
sqlite3 testdb.sqlite3 < create_database.sql
sqlite3 testdb.sqlite3 < insert_testdata.sql
```