import { describe, test, expect, spyOn, mock, beforeAll } from "bun:test";
import { persistBundle } from "../db";
import type { Bundle, BookItem, GoodreadsRating } from "../types";
import * as bun from "bun";
import { SQL } from "bun";

// This is a more realistic test that uses the actual persistBundle function
// and connects to the database using environment variables from .env.local
describe("persistBundle integration", () => {
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

    // Set up environment variables for the test-container.
    process.env.PGHOST = "";
    process.env.PGPORT = "";
    process.env.PGUSERNAME = "";
    process.env.PGPASSWORD = "";
    process.env.PGDATABASE = "";

    // Spy on console.log to verify it's called
    const consoleSpy = spyOn(console, "log");

    try {
      // Call the function with test data
      const result = await persistBundle(testBundle, testBooksWithRatings);
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result.bundleId).toBeGreaterThan(0);
      expect(Array.isArray(result.bookIds)).toBe(true);
      expect(result.bookIds.length).toBe(testBooksWithRatings.length);
      
      console.log("Successfully persisted bundle and books:", result);
      
      // Verify console.log was called with the expected message
      expect(consoleSpy).toHaveBeenCalledWith(
        "successfully inserted bundle to DB: ",
        expect.anything()
      );
    } catch (error) {
      console.error("Test failed with error:", error);
      // If the database is not available, this test will fail
      // This is expected in environments without the database set up
      throw error;
    } finally {
      // Restore the spy
      consoleSpy.mockRestore();
    }
  });
});
