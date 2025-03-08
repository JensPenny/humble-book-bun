# Database Usage Examples

This document provides examples of common SQL queries for the HumbleBun database.

## Inserting Data

### Adding a new bundle

```sql
INSERT INTO bundle (name, type, url, start_bundle, end_bundle, created_ts)
VALUES (
    'Ultimate Cybersecurity Career Bundle',
    'books',
    'https://www.humblebundle.com/books/ultimate-cybersecurity-career-packt-books',
    1709251200, -- Start timestamp (March 1, 2025)
    1711929600, -- End timestamp (April 1, 2025)
    strftime('%s', 'now') -- Current timestamp
);
```

### Adding a book to a bundle

```sql
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
```

### Adding a developer/author

```sql
INSERT INTO developer (name)
VALUES ('Jane Smith');
```

### Linking a book to its author

```sql
INSERT INTO book_developer (book_id, developer_id)
VALUES (1, 1);
```

## Querying Data

### Get all books in a specific bundle with their ratings

```sql
SELECT b.name AS book_name, b.rating_average, b.rating_count, b.review_count
FROM book b
JOIN bundle bu ON b.bundle_id = bu.bundle_id
WHERE bu.name = 'Ultimate Cybersecurity Career Bundle'
ORDER BY b.rating_average DESC;
```

### Get all authors for a specific book

```sql
SELECT d.name AS author_name
FROM developer d
JOIN book_developer bd ON d.developer_id = bd.developer_id
JOIN book b ON bd.book_id = b.book_id
WHERE b.name = 'Practical Cybersecurity Architecture';
```

### Get the most recent bundles

```sql
SELECT name, url, datetime(start_bundle, 'unixepoch') AS start_date,
       datetime(end_bundle, 'unixepoch') AS end_date
FROM bundle
ORDER BY created_ts DESC
LIMIT 10;
```

### Get the highest-rated books across all bundles

```sql
SELECT b.name AS book_name, b.rating_average, b.rating_count,
       bu.name AS bundle_name
FROM book b
JOIN bundle bu ON b.bundle_id = bu.bundle_id
WHERE b.rating_count > 10 -- Only include books with a meaningful number of ratings
ORDER BY b.rating_average DESC
LIMIT 20;
```

## Updating Data

### Update a book's rating information

```sql
UPDATE book
SET rating_average = 4.5,
    rating_count = 150,
    review_count = 42,
    created_ts = strftime('%s', 'now')
WHERE book_id = 1;
```

### Update a bundle's end date

```sql
UPDATE bundle
SET end_bundle = 1712534400 -- New end timestamp (April 8, 2025)
WHERE bundle_id = 1;
```

## Historical Data Queries

### Get all historical ratings for a specific book

```sql
SELECT b.name, b.rating_average, b.rating_count, 
       datetime(b.created_ts, 'unixepoch') AS recorded_date
FROM book b
WHERE b.name = 'Practical Cybersecurity Architecture'
ORDER BY b.created_ts;
```

### Compare current ratings with ratings from a month ago

```sql
WITH current_ratings AS (
    SELECT b.name, b.rating_average, b.created_ts
    FROM book b
    JOIN (
        SELECT name, MAX(created_ts) AS max_ts
        FROM book
        GROUP BY name
    ) latest ON b.name = latest.name AND b.created_ts = latest.max_ts
),
month_ago_ratings AS (
    SELECT b.name, b.rating_average, b.created_ts
    FROM book b
    JOIN (
        SELECT name, MAX(created_ts) AS max_ts
        FROM book
        WHERE created_ts < strftime('%s', 'now', '-30 days')
        GROUP BY name
    ) old ON b.name = old.name AND b.created_ts = old.max_ts
)
SELECT c.name, 
       c.rating_average AS current_rating,
       m.rating_average AS month_ago_rating,
       (c.rating_average - m.rating_average) AS rating_change
FROM current_ratings c
JOIN month_ago_ratings m ON c.name = m.name
ORDER BY rating_change DESC;
```

## Maintenance Queries

### Find books without authors

```sql
SELECT b.book_id, b.name
FROM book b
LEFT JOIN book_developer bd ON b.book_id = bd.book_id
WHERE bd.book_id IS NULL;
```

### Find duplicate book entries

```sql
SELECT name, bundle_id, COUNT(*) AS count
FROM book
GROUP BY name, bundle_id
HAVING COUNT(*) > 1;
