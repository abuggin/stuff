let booksData = [];
let currentBookIndex = -1;

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
        <div class="year-section">
            <h2>${year}</h2>
            <div class="books-grid">
                ${booksHtml}
            </div>
        </div>
    `;
}

function generateBookCard(book, index) {
    const statusClass = book.completed ? 'completed' : 'in-progress';
    return `
        <div class="book ${statusClass}" data-index="${index}" title="${book.title}">
            <div class="book-cover-bg" style="background-image: url('${book.image}')"></div>
        </div>
    `;
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
    status.textContent = book.completed ? 'Completed' : 'In Progress';
    status.className = `modal-status ${book.completed ? 'completed' : 'in-progress'}`;

    overlay.querySelector('.modal-notes').textContent = book.notes || '';
    overlay.querySelector('.modal-link').href = book.url;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function navigateModal(direction) {
    if (currentBookIndex === -1) return;

    let newIndex = currentBookIndex + direction;
    if (newIndex < 0) newIndex = booksData.length - 1;
    if (newIndex >= booksData.length) newIndex = 0;

    openModal(newIndex);
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

    // Flatten all enriched books for indexing (skip query-only entries)
    jsonData.forEach(yearGroup => {
        yearGroup.books.forEach(book => {
            if (book.title) {
                booksData.push(book);
            }
        });
    });

    const contentDiv = document.getElementById('content');
    let globalIndex = 0;

    for (const yearGroup of jsonData) {
        const enrichedBooks = yearGroup.books.filter(b => b.title);
        if (enrichedBooks.length === 0) continue;

        let booksHtml = '';
        for (const book of enrichedBooks) {
            booksHtml += generateBookCard(book, globalIndex);
            globalIndex++;
        }
        contentDiv.innerHTML += generateYearSection(yearGroup.year, booksHtml);
    }

    // Create modal
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
