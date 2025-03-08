// Script to fetch and save HTML from a Goodreads page
const url = 'https://www.goodreads.com/book/show/42399429-how-javascript-works';

async function fetchAndSaveHTML() {
  try {
    console.log(`Fetching HTML from ${url}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'humble-bundle-bun',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    await Bun.write('goodreads_sample.html', html);
    console.log('HTML saved to goodreads_sample.html');
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchAndSaveHTML();
