import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const url =
  "https://www.goodreads.com/book/show/42399429-how-javascript-works";

async function fetchAndSaveHTML() {
  try {
    const cookie = process.env.GOODREADS_COOKIE;
    if (!cookie) {
      console.warn(
        "GOODREADS_COOKIE not set - request will likely be blocked by WAF"
      );
    }

    console.log(`Fetching HTML from ${url}...`);

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    };

    if (cookie) {
      headers["Cookie"] = cookie;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    await Bun.write("goodreads_sample.html", html);
    console.log("HTML saved to goodreads_sample.html");
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchAndSaveHTML();
