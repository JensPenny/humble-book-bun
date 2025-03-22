-- HumbleBun Database Schema for Cloudflare D1
-- This file contains all the SQL statements needed to create the database schema

-- Bundle table: Stores information about Humble Bundles
CREATE TABLE IF NOT EXISTS bundle (
    bundle_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL, 
    type TEXT NOT NULL, 
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
CREATE TABLE IF NOT EXISTS book (
    book_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, 
    bundle_id INTEGER NOT NULL, 
    name TEXT NOT NULL, 
    description TEXT,      -- Book description
    content_type TEXT,     -- Type of content (e.g., "ebook")
    url TEXT, 
    rating_average REAL,   -- Average Goodreads rating
    rating_count INTEGER,  -- Number of ratings on Goodreads
    review_count INTEGER,  -- Number of reviews on Goodreads
    created_ts INTEGER NOT NULL, -- When this record was created
    developer TEXT, -- The author or developer of this book
    FOREIGN KEY(bundle_id) REFERENCES bundle(bundle_id) ON DELETE CASCADE
);

-- Indexes for book table
CREATE INDEX i_book_bundle_id ON book(bundle_id);
CREATE INDEX i_book_name ON book(name);

-- On second thought, I don't think we need developers as a linked table at this moment. We can just push this information in the main book table
-- -- Developer table: Stores information about book authors/developers
-- CREATE TABLE developer (
--     developer_id INTEGER PRIMARY KEY,
--     name TEXT NOT NULL UNIQUE -- Author/developer name
-- );

-- -- Index for developer table
-- CREATE INDEX i_developer_name ON developer(name);

-- -- Book-Developer junction table: Links books to their authors/developers
-- CREATE TABLE book_developer (
--     book_id INTEGER,
--     developer_id INTEGER,
--     PRIMARY KEY (book_id, developer_id),
--     FOREIGN KEY(book_id) REFERENCES book(book_id) ON DELETE CASCADE,
--     FOREIGN KEY(developer_id) REFERENCES developer(developer_id) ON DELETE CASCADE
-- );