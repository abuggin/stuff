# Virtual Bookshelf

## Architecture

- `books.json` - Source list of books by year (search queries or ISBNs)
- `covers/` - Downloaded book cover images
- `books.js` - Runtime JS that renders the bookshelf from enriched data
- `build.js` - Node script that fetches book data from Goodreads and downloads images

## Build Process

```bash
node build.js
node add-book.js
```

This fetches book metadata from Goodreads API and downloads cover images to `covers/` directory, generating `books.json` for the frontend to consume.

## Development

Run a local server (e.g., `python -m http.server`) and open `index.html`.

