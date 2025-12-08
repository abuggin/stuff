#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';
import { execSync } from 'child_process';

const BOOKS_FILE = './books.json';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
    console.log('\n📚 Add a new book\n');

    const query = await prompt('Book title or ISBN: ');
    if (!query.trim()) {
        console.log('Cancelled.');
        rl.close();
        return;
    }

    const currentYear = new Date().getFullYear().toString();
    const yearInput = await prompt(`Year read [${currentYear}]: `);
    const year = yearInput.trim() || currentYear;

    console.log('Status options: (c)ompleted, (i)n-progress, (n)ot-started, (a)bandoned');
    const statusInput = await prompt('Status [c]: ');
    const statusMap = { c: 'completed', i: 'in-progress', n: 'not-started', a: 'abandoned' };
    const status = statusMap[statusInput.toLowerCase().trim()] || 'completed';

    const notes = await prompt('Notes (optional): ');

    rl.close();

    // Load existing data
    const booksData = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8'));

    // Add the book (at the beginning for newest first)
    booksData.unshift({
        year: year.trim(),
        query: query.trim(),
        status,
        notes: notes.trim()
    });

    // Save
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(booksData, null, 2));
    console.log(`\n✓ Added "${query.trim()}" to ${year}`);

    // Run build
    console.log('\nBuilding...\n');
    execSync('node build.js', { stdio: 'inherit' });

    console.log('\n✓ Done!\n');
}

main().catch(err => {
    console.error(err);
    rl.close();
    process.exit(1);
});
