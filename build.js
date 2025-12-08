#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';

const COVERS_DIR = './covers';
const BOOKS_FILE = './books.json';

// Ensure covers directory exists
if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpsGet(res.headers.location).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ data, statusCode: res.statusCode }));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);

        const doRequest = (requestUrl) => {
            https.get(requestUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    doRequest(res.headers.location);
                    return;
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${res.statusCode}`));
                    return;
                }

                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(filepath, () => {});
                reject(err);
            });
        };

        doRequest(url);
    });
}

function removeSmallSize(url) {
    return url.split(/\._S\w\d+_/).join('');
}

function getAuthorSurname(fullName) {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
}

function generateImageFilename(title, author) {
    // Take first 30 chars of title, normalize
    const shortTitle = title
        .substring(0, 30)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    const surname = getAuthorSurname(author);

    return `${shortTitle}_${surname}.jpg`;
}

async function queryGoodReadsAPI(query) {
    console.log(`Fetching: "${query}"`);
    const goodReadsRoot = "https://www.goodreads.com";
    const url = `${goodReadsRoot}/book/auto_complete?format=json&q=${encodeURIComponent(query)}`;

    try {
        const { data, statusCode } = await httpsGet(url);

        if (statusCode !== 200) {
            throw new Error(`HTTP ${statusCode}`);
        }

        const results = JSON.parse(data);
        if (!results || results.length === 0) {
            console.warn(`  No results found`);
            return null;
        }

        const book = results[0];
        return {
            title: book.title,
            author: book.author.name,
            url: goodReadsRoot + book.bookUrl,
            imageUrl: removeSmallSize(book.imageUrl)
        };
    } catch (error) {
        console.error(`  Error:`, error.message);
        return null;
    }
}

async function processBooks() {
    const booksData = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8'));
    let modified = false;

    for (let i = 0; i < booksData.length; i++) {
        const book = booksData[i];

        // Skip already enriched books (have title field)
        if (book.title) {
            console.log(`Skipping: "${book.title}" (already enriched)`);
            continue;
        }

        // This is a query-only entry, needs enrichment
        if (!book.query) {
            continue;
        }

        const info = await queryGoodReadsAPI(book.query);

        if (info) {
            const imageFilename = generateImageFilename(info.title, info.author);
            const imagePath = path.join(COVERS_DIR, imageFilename);

            // Download cover if not exists
            if (fs.existsSync(imagePath)) {
                console.log(`  Cover exists`);
            } else {
                try {
                    console.log(`  Downloading cover...`);
                    await downloadImage(info.imageUrl, imagePath);
                    console.log(`  Saved: ${imageFilename}`);
                } catch (err) {
                    console.error(`  Failed to download:`, err.message);
                }
            }

            // Replace query entry with enriched data
            booksData[i] = {
                year: book.year,
                title: info.title,
                author: info.author,
                url: info.url,
                image: `covers/${imageFilename}`,
                notes: book.notes || '',
                status: book.status || 'completed'
            };
            modified = true;
        }

        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 200));
    }

    if (modified) {
        fs.writeFileSync(BOOKS_FILE, JSON.stringify(booksData, null, 2));
        console.log(`\nUpdated ${BOOKS_FILE}`);
    } else {
        console.log(`\nNo changes needed`);
    }
}

processBooks().catch(console.error);
