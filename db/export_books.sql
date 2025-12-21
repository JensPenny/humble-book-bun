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
        b.developer AS developers,
        (
            SELECT json_agg(
                json_build_object(
                    'bundle_id', b2.bundle_id,
                    'name', bu2.name,
                    'start_bundle', to_timestamp(bu2.start_bundle),
                    'end_bundle', to_timestamp(bu2.end_bundle)
                )
            )
            FROM book b2
            JOIN bundle bu2 ON b2.bundle_id = bu2.bundle_id
            WHERE b2.name = b.name
            AND b2.bundle_id != b.bundle_id
        ) AS other_bundles
    FROM book b
    JOIN bundle bu ON b.bundle_id = bu.bundle_id
    ORDER BY b.name
) AS book_data;
\o
\pset format aligned
\pset tuples_only off
