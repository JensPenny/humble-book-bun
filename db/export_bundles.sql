-- Export bundles as JSON for Static site generation
\pset format unaligned
\pset tuples_only on
\o bundles.json
SELECT json_agg(bundle_data)
FROM (
    SELECT 
        bundle.bundle_id AS id, 
        bundle.name, 
        bundle.type, 
        bundle.url, 
        to_timestamp(bundle.start_bundle) AS start_date,
        to_timestamp(bundle.end_bundle) AS end_date,
        to_timestamp(bundle.created_ts) AS created_date
    FROM bundle
    ORDER BY bundle.bundle_id DESC
) AS bundle_data;
\o
\pset format aligned
\pset tuples_only off
