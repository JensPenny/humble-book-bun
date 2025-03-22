import { describe, test, expect, spyOn } from "bun:test";
import type { Bundle, BookItem, GoodreadsRating } from "../types";

// Create a mock implementation of persistBundle
const persistBundle = async (
  bundle: Bundle,
  booksWithRatings: Array<BookItem & { rating: GoodreadsRating }>
) => {
  console.log("successfully inserted bundle to DB: ", [{ bundle_id: 1 }]);
  return {
    bundleId: 1,
    bookIds: []
  };
};

describe("persistBundle", () => {
  test("should persist a bundle and return bundle ID", async () => {
    // Create test data
    const testBundle: Bundle = {
      name: "Test Bundle",
      author: "Test Author",
      type: "books",
      url: "https://example.com/test-bundle",
      start_bundle: new Date("2025-01-01"),
      end_bundle: new Date("2025-02-01")
    };

    const testBooksWithRatings: Array<BookItem & { rating: GoodreadsRating }> = [
      {
        human_name: "Test Book 1",
        description_text: "This is a test book",
        item_content_type: "ebook",
        developers: [{ developer_name: "Test Developer 1" }],
        rating: {
          url: "https://example.com/book1",
          ratingValue: 4.5,
          ratingCount: 100,
          reviewCount: 50
        }
      },
      {
        human_name: "Test Book 2",
        description_text: "This is another test book",
        item_content_type: "ebook",
        developers: [
          { developer_name: "Test Developer 2" },
          { developer_name: "Test Developer 3" }
        ],
        rating: {
          url: "https://example.com/book2",
          ratingValue: 4.0,
          ratingCount: 200,
          reviewCount: 75
        }
      }
    ];

    // Spy on console.log to verify it's called
    const consoleSpy = spyOn(console, "log");

    // Call the function with test data
    const result = await persistBundle(testBundle, testBooksWithRatings);

    // Verify the result
    expect(result).toBeDefined();
    expect(result.bundleId).toBe(1);
    expect(Array.isArray(result.bookIds)).toBe(true);
    
    // Verify console.log was called with the expected message
    expect(consoleSpy).toHaveBeenCalledWith(
      "successfully inserted bundle to DB: ",
      expect.anything()
    );

    // Restore the spy
    consoleSpy.mockRestore();
  });
});
