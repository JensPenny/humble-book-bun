-- Export books as JSON for Static Site Generation
\pset format unaligned
\pset tuples_only on
\o books.json
SELECT json_agg(book_data)
FROM (
    SELECT 
        b.book_id AS id,
        b.bundle_id,
        bu.name AS bundle_name,
        b.name,
        b.description,
        b.content_type,
        b.url,
        b.rating_average,
        b.rating_count,
        b.review_count,
        to_timestamp(b.created_ts) AS created,
        b.developer AS developers
    FROM book b
    JOIN bundle bu ON b.bundle_id = bu.bundle_id
    ORDER BY b.name
) AS book_data;
\o
\pset format aligned
\pset tuples_only off