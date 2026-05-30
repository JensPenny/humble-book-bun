import type { BookItem, BookRating } from "../types";

function buildGoodreadsHeaders(referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua":
      '"Chromium";v="125", "Google Chrome";v="125", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
  };

  if (referer) {
    headers["Referer"] = referer;
  }

  const cookie = process.env.GOODREADS_COOKIE;
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  return headers;
}

function isWafChallenge(status: number, html: string): boolean {
  if (status === 403 || status === 405) {
    return true;
  }

  const wafSignals = [
    "aws-waf-token",
    "awswaf",
    "captcha.js",
    "challenge.js",
    "To discuss automated access to Amazon data please contact",
  ];

  const lowerHtml = html.toLowerCase();
  return wafSignals.some((signal) => lowerHtml.includes(signal.toLowerCase()));
}

function logCookieRefreshInstructions(): void {
  console.warn("=".repeat(70));
  console.warn("GOODREADS COOKIE EXPIRED OR MISSING");
  console.warn("=".repeat(70));
  console.warn("Goodreads is blocking requests via AWS WAF.");
  console.warn("To fix this:");
  console.warn("  1. Open https://www.goodreads.com in your browser");
  console.warn("  2. Open DevTools (F12) > Network tab");
  console.warn("  3. Reload the page");
  console.warn("  4. Click any request to goodreads.com");
  console.warn("  5. Copy the full 'Cookie' header value");
  console.warn("  6. Set GOODREADS_COOKIE in your .env.local file");
  console.warn("=".repeat(70));
}

function nullRating(url: string | null): BookRating {
  return { source: "goodreads", ratingValue: null, ratingCount: null, reviewCount: null, url };
}

export async function getGoodreadsRating(
  book: BookItem
): Promise<BookRating> {
  try {
    const bookWithoutNewlines = book.human_name.replace(/\n/g, " ");
    const titleFirstWords = getWordsFromTitle(bookWithoutNewlines, 10);
    const searchUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(titleFirstWords)}`;
    console.log(`Searching Goodreads for: ${book.human_name}`);

    const searchResponse = await fetch(searchUrl, {
      headers: buildGoodreadsHeaders(),
      redirect: "follow",
    });

    const searchHtml = await searchResponse.text();

    if (isWafChallenge(searchResponse.status, searchHtml)) {
      logCookieRefreshInstructions();
      console.warn(`WAF blocked search for: ${book.human_name}`);
      return nullRating(searchUrl);
    }

    if (!searchResponse.ok) {
      console.error(`Failed to search Goodreads: ${searchResponse.status}`);
      return nullRating(searchUrl);
    }

    const bookUrlMatch = searchHtml.match(/href="(\/book\/show\/[^"]+)"/);
    if (!bookUrlMatch) {
      console.log(`No Goodreads results found for: ${book.human_name}`);
      return nullRating(searchUrl);
    }

    const bookRelativeUrl = bookUrlMatch[1];
    const bookUrl = `https://www.goodreads.com${bookRelativeUrl}`;
    console.log(`Found Goodreads page: ${bookUrl}`);

    const bookResponse = await fetch(bookUrl, {
      headers: buildGoodreadsHeaders(searchUrl),
      redirect: "follow",
    });

    const bookHtml = await bookResponse.text();

    if (isWafChallenge(bookResponse.status, bookHtml)) {
      logCookieRefreshInstructions();
      console.warn(`WAF blocked book page for: ${book.human_name}`);
      return nullRating(bookUrl);
    }

    if (!bookResponse.ok) {
      console.error(`Failed to fetch book page: ${bookResponse.status}`);
      return nullRating(bookUrl);
    }

    let ratingValue: number | null = null;
    let ratingCount: number | null = null;
    let reviewCount: number | null = null;

    let jsonLdContent = "";
    const rewriter = new HTMLRewriter().on(
      'script[type="application/ld+json"]',
      {
        text(text) {
          jsonLdContent += text.text;
        },
      }
    );

    rewriter.transform(bookHtml);

    if (jsonLdContent) {
      try {
        const jsonData = JSON.parse(jsonLdContent);
        if (jsonData.aggregateRating && jsonData.aggregateRating.ratingValue) {
          ratingValue = parseFloat(jsonData.aggregateRating.ratingValue);
        }

        if (jsonData.aggregateRating && jsonData.aggregateRating.ratingCount) {
          ratingCount = parseInt(jsonData.aggregateRating.ratingCount);
        }

        if (jsonData.aggregateRating && jsonData.aggregateRating.reviewCount) {
          reviewCount = parseInt(jsonData.aggregateRating.reviewCount);
        }
      } catch (e) {
        console.error(`Error parsing JSON-LD data: ${e}`);
      }
    }

    if (ratingValue === null) {
      let ratingMatch = bookHtml.match(
        /itemprop="ratingValue" content="([0-9.]+)"/
      );

      if (!ratingMatch) {
        ratingMatch = bookHtml.match(/"ratingValue":"([0-9.]+)"/);
      }

      if (!ratingMatch) {
        ratingMatch = bookHtml.match(
          /class="RatingStatistics__rating">([0-9.]+)</
        );
      }

      if (ratingMatch) {
        ratingValue = parseFloat(ratingMatch[1]);
      }
    }

    if (ratingCount === null) {
      const ratingCountMatch = bookHtml.match(
        /data-testid="ratingsCount"[^>]*>(\d+)/
      );
      if (ratingCountMatch) {
        ratingCount = parseInt(ratingCountMatch[1]);
      }
    }

    if (reviewCount === null) {
      const reviewCountMatch = bookHtml.match(
        /data-testid="reviewsCount"[^>]*>(\d+)/
      );
      if (reviewCountMatch) {
        reviewCount = parseInt(reviewCountMatch[1]);
      }
    }

    const rating: BookRating = {
      source: "goodreads",
      ratingValue,
      ratingCount,
      reviewCount,
      url: bookUrl,
    };

    if (ratingValue !== null) {
      console.log(
        `Found rating for "${book.human_name}": ${ratingValue}/5 - ${ratingCount} ratings - ${reviewCount} reviews`
      );
    } else {
      console.log(`Could not extract rating for: ${book.human_name}`);
    }

    return rating;
  } catch (error) {
    console.error(
      `Error getting Goodreads rating for "${book.human_name}":`,
      error
    );
    return nullRating(null);
  }
}

function getWordsFromTitle(title: string, amount: number): string {
  const regex = /\b\w+\b/g;
  let match;
  let count = 0;
  let lastIndex = 0;

  while ((match = regex.exec(title)) !== null) {
    count++;
    lastIndex = match.index + match[0].length;
    if (count == amount) {
      break;
    }
  }

  if (lastIndex === 0) {
    return title;
  } else {
    return title.slice(0, lastIndex);
  }
}

export async function getGoodreadsRatings(
  books: BookItem[]
): Promise<Array<BookItem & { rating: BookRating }>> {
  if (!process.env.GOODREADS_COOKIE) {
    console.warn(
      "Warning: GOODREADS_COOKIE is not set. Goodreads requests will likely be blocked by AWS WAF."
    );
    logCookieRefreshInstructions();
  }

  const booksWithRatings: Array<BookItem & { rating: BookRating }> = [];
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  for (const book of books) {
    const rating = await getGoodreadsRating(book);
    booksWithRatings.push({ ...book, rating });

    if (rating.ratingValue === null && rating.ratingCount === null) {
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `${MAX_CONSECUTIVE_FAILURES} consecutive Goodreads failures. Skipping remaining books. Check your GOODREADS_COOKIE.`
      );
      for (const remainingBook of books.slice(booksWithRatings.length)) {
        booksWithRatings.push({
          ...remainingBook,
          rating: nullRating(null),
        });
      }
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return booksWithRatings;
}
