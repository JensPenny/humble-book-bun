<template>
  <main>
    <div class="container">
      <h1>Humble Bundle Book Analyzer</h1>
      
      <form @submit.prevent="analyzeBundle">
        <div class="form-group">
          <label for="bundle-url">Humble Bundle URL:</label>
          <input 
            type="text" 
            id="bundle-url" 
            v-model="bundleUrl" 
            required 
            placeholder="https://www.humblebundle.com/books/..."
            title="Please enter a valid Humble Bundle URL (e.g., https://www.humblebundle.com/books/example-bundle)"
          />
        </div>
        <button type="submit" :disabled="isLoading">Analyze Bundle</button>
      </form>
      
      <div v-if="isLoading" class="loading">
        <p>Analyzing bundle... This may take a minute or two.</p>
        <div class="spinner"></div>
      </div>
      
      <div v-if="error" class="error">
        <p>{{ error }}</p>
      </div>
      
      <div v-if="showResults" class="results">
        <h2>Results</h2>
        <table>
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Author(s)</th>
              <th>Goodreads Rating</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="book in books" :key="book.human_name">
              <td>{{ book.human_name }}</td>
              <td>{{ book.developers.map(dev => dev.developer_name).join(', ') }}</td>
              <td>{{ formatRating(book.rating) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { BookItem, GoodreadsRating } from '../../api/types';

export default defineComponent({
  name: 'App',
  setup() {
    const bundleUrl = ref('');
    const isLoading = ref(false);
    const books = ref<Array<BookItem & { rating: GoodreadsRating }>>([]);
    const error = ref<string | null>(null);
    const showResults = ref(false);

    async function analyzeBundle() {
      if (!bundleUrl.value) return;
      
      // Validate URL format
      if (!bundleUrl.value.startsWith('https://www.humblebundle.com/books/')) {
        error.value = 'Please enter a valid Humble Bundle URL (e.g., https://www.humblebundle.com/books/example-bundle)';
        return;
      }
      
      isLoading.value = true;
      showResults.value = false;
      error.value = null;
      
      try {
        // Send the URL to the server for analysis
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: bundleUrl.value })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze bundle');
        }
        
        // Fetch the results using the returned ID
        const resultsResponse = await fetch(`/api/results/${data.id}`);
        const resultsData = await resultsResponse.json();
        
        if (!resultsResponse.ok) {
          throw new Error(resultsData.error || 'Failed to retrieve results');
        }
        
        books.value = resultsData.books;
        showResults.value = true;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'An unknown error occurred';
      } finally {
        isLoading.value = false;
      }
    }

    function formatRating(rating: GoodreadsRating): string {
      if (!rating.ratingValue) return 'No rating found';
      
      let ratingText = `${rating.ratingValue}/5`;
      if (rating.ratingCount) {
        ratingText += ` (${rating.ratingCount} ratings`;
        if (rating.reviewCount) {
          ratingText += `, ${rating.reviewCount} reviews`;
        }
        ratingText += ')';
      }
      return ratingText;
    }

    return {
      bundleUrl,
      isLoading,
      books,
      error,
      showResults,
      analyzeBundle,
      formatRating
    };
  }
});
</script>

<style scoped>
.container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2980b9;
}

button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.loading {
  margin-top: 20px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3498db;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
}

tr:hover {
  background-color: #f5f5f5;
}

.error {
  color: #e74c3c;
  padding: 10px;
  background-color: #fadbd8;
  border-radius: 4px;
  margin-top: 20px;
}

.results {
  margin-top: 20px;
}
</style>
