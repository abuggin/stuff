let booksData = [];
let currentBookIndex = -1;
let currentFilter = 'all';

const STATUS_LABELS = {
    'completed': 'Completed',
    'in-progress': 'In Progress',
    'not-started': 'Not Started',
    'abandoned': 'Abandoned'
};

async function fetchJsonData() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Missing file books.json\n' + response.statusText);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching JSON data:', error);
        return null;
    }
}

function generateYearSection(year, booksHtml) {
    return `
        <div class="year-section" data-year="${year}">
            <h2>${year}</h2>
            <div class="books-grid">
                ${booksHtml}
            </div>
        </div>
    `;
}

function generateBookCard(book, index) {
    return `
        <div class="book ${book.status}" data-index="${index}" data-status="${book.status}" title="${book.title}">
            <div class="book-cover-bg" style="background-image: url('${book.image}')"></div>
        </div>
    `;
}

function createFilters() {
    const header = document.querySelector('h1');
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filters';
    filterDiv.innerHTML = `
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="completed">Completed</button>
        <button class="filter-btn" data-filter="in-progress">In Progress</button>
        <button class="filter-btn" data-filter="not-started">Not Started</button>
        <button class="filter-btn" data-filter="abandoned">Abandoned</button>
    `;
    header.after(filterDiv);

    filterDiv.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterDiv.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFilter();
        });
    });
}

function applyFilter() {
    document.querySelectorAll('.book').forEach(bookEl => {
        const status = bookEl.dataset.status;
        const shouldShow = currentFilter === 'all' || status === currentFilter;

        if (shouldShow) {
            bookEl.classList.remove('hidden');
        } else {
            bookEl.classList.add('hidden');
        }
    });
}

function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-cover"></div>
            <div class="modal-content">
                <h3 class="modal-title"></h3>
                <p class="modal-author"></p>
                <span class="modal-status"></span>
                <p class="modal-notes"></p>
                <a class="modal-link" href="#" target="_blank">View on Goodreads</a>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

function openModal(index) {
    currentBookIndex = index;
    const book = booksData[index];
    const overlay = document.querySelector('.modal-overlay');

    overlay.querySelector('.modal-cover').style.backgroundImage = `url('${book.image}')`;
    overlay.querySelector('.modal-title').textContent = book.title;
    overlay.querySelector('.modal-author').textContent = book.author;

    const status = overlay.querySelector('.modal-status');
    status.textContent = STATUS_LABELS[book.status] || book.status;
    status.className = `modal-status ${book.status}`;

    overlay.querySelector('.modal-notes').textContent = book.notes || '';
    overlay.querySelector('.modal-link').href = book.url;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function navigateModal(direction) {
    if (currentBookIndex === -1) return;

    // Get visible book indices based on current filter
    const visibleIndices = [];
    document.querySelectorAll('.book:not([style*="display: none"])').forEach(el => {
        visibleIndices.push(parseInt(el.dataset.index, 10));
    });

    if (visibleIndices.length === 0) return;

    const currentPos = visibleIndices.indexOf(currentBookIndex);
    let newPos = currentPos + direction;
    if (newPos < 0) newPos = visibleIndices.length - 1;
    if (newPos >= visibleIndices.length) newPos = 0;

    openModal(visibleIndices[newPos]);
}

function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    currentBookIndex = -1;
}

async function processJsonData() {
    const jsonData = await fetchJsonData();
    if (!jsonData) return;

    // Filter to enriched books only (have title field)
    const enrichedBooks = jsonData.filter(book => book.title);
    booksData.push(...enrichedBooks);

    // Group by year
    const byYear = {};
    enrichedBooks.forEach((book, index) => {
        if (!byYear[book.year]) byYear[book.year] = [];
        byYear[book.year].push({ book, index });
    });

    // Sort years descending
    const years = Object.keys(byYear).sort((a, b) => parseInt(b) - parseInt(a));

    const contentDiv = document.getElementById('content');

    for (const year of years) {
        let booksHtml = '';
        for (const { book, index } of byYear[year]) {
            booksHtml += generateBookCard(book, index);
        }
        contentDiv.innerHTML += generateYearSection(year, booksHtml);
    }

    // Create filters and modal
    createFilters();
    createModal();

    // Add click handlers
    document.querySelectorAll('.book').forEach(bookEl => {
        bookEl.addEventListener('click', () => {
            const index = parseInt(bookEl.dataset.index, 10);
            openModal(index);
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            navigateModal(-1);
        } else if (e.key === 'ArrowRight') {
            navigateModal(1);
        }
    });
}

document.addEventListener('DOMContentLoaded', processJsonData);
