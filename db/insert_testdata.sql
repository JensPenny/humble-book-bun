-- Sample data for testing

-- Insert a sample bundle
INSERT INTO bundle (name, type, url, start_bundle, end_bundle, created_ts)
VALUES (
    'Ultimate Cybersecurity Career Bundle',
    'books',
    'https://www.humblebundle.com/books/ultimate-cybersecurity-career-packt-books',
    1709251200, -- Start timestamp (March 1, 2025)
    1711929600, -- End timestamp (April 1, 2025)
    strftime('%s', 'now') -- Current timestamp
);

-- Insert a sample book
INSERT INTO book (
    bundle_id, name, description, content_type, url,
    rating_average, rating_count, review_count, created_ts
)
VALUES (
    1, -- bundle_id from the bundle table
    'Practical Cybersecurity Architecture',
    'A comprehensive guide to designing secure systems and networks',
    'ebook',
    'https://www.example.com/book-url',
    4.2, -- Average rating
    120, -- Number of ratings
    35,  -- Number of reviews
    strftime('%s', 'now') -- Current timestamp
);

-- Insert a sample developer/author
INSERT INTO developer (name)
VALUES ('Jane Smith');

-- Link the book to its author
INSERT INTO book_developer (book_id, developer_id)
VALUES (1, 1);
