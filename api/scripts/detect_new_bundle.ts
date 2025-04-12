import type { Bundle } from "../types";

const BASE_URL = "https://www.humblebundle.com"
const BOOK_URL = `${BASE_URL}/books`;

async function runScript(){
    // 1. Get the current bundles

    // 2. Find the new bundles compared to the already exported bundles. Use a file where you record the last start-date for the last persisted bundle

    // 3. Do the goodreads bundle scripting for each new bundle

    // 4. Export the data base to the static site generator

    // 5. Upload the new static site to the deploy
}

async function getCurrentBookBundles(){
    try {
        const response = await fetch(BOOK_URL, {
            headers: {
                'User-Agent': 'humble-bundle-bun', 
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en',
            }
        });

        const html = await response.text();

        // We'll use the same logic from humble.ts to develop this script. At least the base logic. This means: fetch the base script with information
        let script_tag = "";
        const scriptor = new HTMLRewriter().on("script#landingPage-json-data", {
          text(text){
            script_tag += text.text;
          }, 
        });
        scriptor.transform(html);
        const as_json = JSON.parse(script_tag);
        //console.log(`found script: ${script_tag}`);

        const bundle_mosaics:[] = as_json.data.books.mosaic[0].products;
        const bundles = bundle_mosaics.map(bundle_json => {
            const converted: Bundle = {
                name: bundle_json.machine_name,
                author: bundle_json.author,
                type: bundle_json.category,
                url: bundle_json.product_url,
                start_bundle: new Date(bundle_json["start_date|datetime"]),
                end_bundle: new Date(bundle_json["end_date|datetime"])
            }

            return converted
        })
        console.log(`found bundles: ${JSON.stringify(bundles)}`);

        const bundle_names = bundles.map(bundle => bundle.name);
        //console.log(`bundle names: ${JSON.stringify(bundle_names)}`);

        const bundle_urls = bundles.map(bundle => bundle.url);
        //console.log(`bundle urls: ${JSON.stringify(bundle_urls)}`);        
    } catch (err) {
        console.error(`Could not fetch latest book bundle: ${err}`);
    }
}

getCurrentBookBundles();