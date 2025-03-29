-- Export bundles with their books as JSON for Static Site Generation
\pset format unaligned
\pset tuples_only on
\o bundles_with_books.json
SELECT json_agg(bundle_with_books)
FROM (
    SELECT 
        bu.bundle_id AS id,
        bu.name,
        bu.type,
        bu.url,
        to_timestamp(bu.start_bundle) AS start_date,
        to_timestamp(bu.end_bundle) AS end_date,
        to_timestamp(bu.created_ts) AS created,
        (
            SELECT json_agg(book_data)
            FROM (
                SELECT 
                    b.book_id AS id,
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
                WHERE b.bundle_id = bu.bundle_id
                ORDER BY b.name
            ) AS book_data
        ) AS books
    FROM bundle bu
    ORDER BY bu.name
) AS bundle_with_books;
\o
\pset format aligned
\pset tuples_only off