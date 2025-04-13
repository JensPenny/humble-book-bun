import { parseArgs } from "util";
import type { Bundle } from "../types";
import { existsSync, readFileSync, writeFileSync } from "fs";

const BASE_URL = "https://www.humblebundle.com";
const BOOK_URL = `${BASE_URL}/books`;

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    last_updated_file: {
      type: "string",
    },
    urls_to_parse: {
      type: "string",
    },
  },
  strict: true, 
  allowPositionals: true,
});

// Check if required arguments are provided
if (!values.last_updated_file || !values.urls_to_parse) {
  console.error("Error: Both --last_updated_file and --urls_to_parse arguments are required");
  process.exit(1);
}

// Function to read the last update timestamp
function getLastUpdateTimestamp(filePath: string): Date {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8').trim();
      if (content) {
        return new Date(content);
      }
    }
    // If file doesn't exist or is empty, return a date far in the past
    return new Date(0);
  } catch (err) {
    console.error(`Error reading last update file: ${err}`);
    return new Date(0);
  }
}

// Function to write URLs to the output file
function writeUrlsToFile(filePath: string, urls: string[]): void {
  try {
    const withBaseUrl = urls.map(url => `${BASE_URL}${url}`).join('\n');
    writeFileSync(filePath, `${withBaseUrl}\n`, 'utf-8');
    console.log(`Wrote ${urls.length} URLs to ${filePath}`);
  } catch (err) {
    console.error(`Error writing URLs to file: ${err}`);
  }
}

// Function to update the last update timestamp
function updateLastUpdateTimestamp(filePath: string, timestamp: Date): void {
  try {
    writeFileSync(filePath, timestamp.toISOString(), 'utf-8');
    console.log(`Updated last update timestamp to ${timestamp.toISOString()}`);
  } catch (err) {
    console.error(`Error updating last update timestamp: ${err}`);
  }
}

async function getCurrentBookBundles(): Promise<Bundle[]> {
  try {
    const response = await fetch(BOOK_URL, {
      headers: {
        "User-Agent": "humble-bundle-bun",
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "en-US,en",
      },
    });

    const html = await response.text();

    // We'll use the same logic from humble.ts to develop this script. At least the base logic. This means: fetch the base script with information
    let script_tag = "";
    const scriptor = new HTMLRewriter().on("script#landingPage-json-data", {
      text(text) {
        script_tag += text.text;
      },
    });
    scriptor.transform(html);
    const as_json = JSON.parse(script_tag);
    //console.log(`found script: ${script_tag}`);

    const bundle_mosaics: any[] = as_json.data.books.mosaic[0].products;
    const bundles = bundle_mosaics.map((bundle_json: any) => {
      const converted: Bundle = {
        name: bundle_json.machine_name,
        author: bundle_json.author,
        type: bundle_json.category,
        url: bundle_json.product_url,
        start_bundle: new Date(bundle_json["start_date|datetime"]),
        end_bundle: new Date(bundle_json["end_date|datetime"]),
      };

      return converted;
    });
    console.log(`Found ${bundles.length} bundles`);

    return bundles;
  } catch (err) {
    console.error(`Could not fetch latest book bundle: ${err}`);
    return [];
  }
}

async function main() {
  // Get the last update timestamp
  const lastUpdateTimestamp = getLastUpdateTimestamp(values.last_updated_file as string);
  console.log(`Last update timestamp: ${lastUpdateTimestamp.toISOString()}`);

  // Get current bundles
  const bundles = await getCurrentBookBundles();
  
  if (bundles.length === 0) {
    console.error("No bundles found, exiting");
    return;
  }

  // Filter for new bundles (those with start date after the last update)
  const newBundles = bundles.filter(bundle => bundle.start_bundle > lastUpdateTimestamp);
  console.log(`Found ${newBundles.length} new bundles since last update`);

  if (newBundles.length > 0) {
    // Extract URLs of new bundles
    const newBundleUrls = newBundles.map(bundle => bundle.url);
    
    // Write URLs to the output file
    writeUrlsToFile(values.urls_to_parse as string, newBundleUrls);
    
    // Find the most recent bundle start time
    const mostRecentStartTime = new Date(Math.max(...newBundles.map(bundle => bundle.start_bundle.getTime())));
    
    // Update the last update timestamp
    updateLastUpdateTimestamp(values.last_updated_file as string, mostRecentStartTime);
  } else {
    console.log("No new bundles found");
    // Write empty file to ensure it exists
    writeUrlsToFile(values.urls_to_parse as string, []);
  }
}

main().catch(err => {
  console.error(`Error in main function: ${err}`);
  process.exit(1);
});
