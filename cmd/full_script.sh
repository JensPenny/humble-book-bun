#! /bin/bash

# This is a script that will 'glue' all the code in this repo together. 
# This should end with an updated static site that will be uploaded to github
# Prerequisites: bun installed, git installed, PGPASSWORD environment variable set

# The steps for this script are:
# 1. Get the newer bundles by running the bun script api/scripts/detect_new_bundle.ts
bun ../api/scripts/detect_new_bundle.ts --last_updated_file=last_update --urls_to_parse=urls_to_parse
# 2. Do the goodreads bundle scripting for each new bundle
echo "Processing URLs from urls_to_parse file..."
if [ -s urls_to_parse ]; then
  # Handle the case of a single URL without a newline at the end
  mapfile -t urls < urls_to_parse
  for url in "${urls[@]}"; do
    if [ -n "$url" ]; then
      echo "Processing URL: $url"
      ./run-humble-analyzer.sh "$url"
    fi
  done
  echo "All URLs processed successfully."
else
  echo "No URLs to process. urls_to_parse file is empty."
fi

# 3. Export the database to the static site generator
cd ../db && ./export_to_astro.sh
# 4. Generate the site again, just for local testing
cd ../site_gen/humble_astro && npm run build
# 4. Upload the new static site to the deploy. Force the commit, if this is running in a container this might behave weirdly otherwise
cd /app && git add ./site_gen/humble_astro/data && git commit -m "automated commit by export script" && git push
