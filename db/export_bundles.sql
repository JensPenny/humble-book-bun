-- Export bundles as JSON for Static site generation
\pset format unaligned
\pset tuples_only on
\o bundles.json
SELECT json_agg(bundle_data)
FROM (
   SELECT 
        bu.bundle_id AS id, 
        bu.name, 
        bu.type, 
        bu.url, 
        to_timestamp(bu.start_bundle) AS start_date,
        to_timestamp(bu.end_bundle) AS end_date,
        to_timestamp(bu.created_ts) AS created_date,
        -- Get the total amount of books in this bundle as a field
        ( 
           SELECT count(*) 
           FROM book bc 
           WHERE bc.bundle_id = bu.bundle_id 
         ) AS total_books,
        -- Get the other bundles information in this export
        (
            SELECT json_agg(
                json_build_object(
                    'bundle_id', bu2.bundle_id,
                    'name', bu2.name,
                    'start_bundle', to_timestamp(bu2.start_bundle),
                    'end_bundle', to_timestamp(bu2.end_bundle),
                    'shared_books_count', shared_count.count
                )
            )
            FROM (
                SELECT DISTINCT b2.bundle_id, COUNT(*) as count
                FROM book b1
                JOIN book b2 ON b1.name = b2.name
                WHERE b1.bundle_id = bu.bundle_id
                AND b2.bundle_id != bu.bundle_id
                GROUP BY b2.bundle_id
            ) AS shared_count
            JOIN bundle bu2 ON shared_count.bundle_id = bu2.bundle_id
        ) AS related_bundles
    FROM bundle bu
    ORDER BY bu.bundle_id DESC
) AS bundle_data;
\o
\pset format aligned
\pset tuples_only off
