document.addEventListener('DOMContentLoaded', () => {
    // --- STATE AND CONSTANTS ---
    const STORAGE_KEY = 'serverlessWords';
    let words = [];
    let currentRandomWord = null; // --- NEW --- State for the currently displayed random word

    // --- DOM ELEMENT REFERENCES ---
    const addWordForm = document.getElementById('add-word-form');
    const wordInput = document.getElementById('word-input');
    const definitionInput = document.getElementById('definition-input'); // --- NEW ---
    const wordList = document.getElementById('word-list');
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file-input');
    const listAllBtn = document.getElementById('list-all-btn');
    const randomWordBtn = document.getElementById('random-word-btn');
    const randomWordDisplayContainer = document.getElementById('random-word-display-container');

    // --- CORE FUNCTIONS ---

    /**
     * --- MODIFIED --- Renders the list of words and definitions.
     */
    const renderWords = () => {
        wordList.innerHTML = '';
        randomWordDisplayContainer.innerHTML = '';
        currentRandomWord = null; // Reset random word state

        if (words.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#888';
            emptyMessage.textContent = 'Your word list is empty.';
            wordList.appendChild(emptyMessage);
            return;
        }
        
        words.forEach(entry => {
            const li = document.createElement('li');

            const contentDiv = document.createElement('div');
            contentDiv.className = 'word-content';

            const wordEl = document.createElement('strong');
            wordEl.textContent = entry.word;

            const definitionEl = document.createElement('p');
            definitionEl.textContent = entry.definition;
            
            contentDiv.appendChild(wordEl);
            contentDiv.appendChild(definitionEl);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'delete-btn';
            deleteBtn.setAttribute('data-id', entry.id);

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);
            wordList.appendChild(li);
        });
    };

    /**
     * Saves the current 'words' array to localStorage.
     */
    const saveWords = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    };

    /**
     * Loads words from localStorage into the 'words' array.
     */
    const loadWords = () => {
        const storedWords = localStorage.getItem(STORAGE_KEY);
        if (storedWords) {
            words = JSON.parse(storedWords);
        }
    };

    // --- EVENT HANDLERS ---

    /**
     * --- MODIFIED --- Handles form submission to add a new word and definition.
     */
    const handleAddWord = (event) => {
        event.preventDefault();
        const wordText = wordInput.value.trim();
        const definitionText = definitionInput.value.trim();
        
        if (wordText === '' || definitionText === '') {
            alert('Word and Definition cannot be empty.');
            return;
        }

        const newWord = {
            id: crypto.randomUUID(),
            word: wordText,
            definition: definitionText,
            createdAt: new Date().toISOString(),
        };

        words.unshift(newWord);
        saveWords();
        renderWords();
        
        wordInput.value = '';
        definitionInput.value = '';
        wordInput.focus();
    };

    /**
     * Handles clicks on the word list for deleting entries.
     */
    const handleListClick = (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const wordId = event.target.getAttribute('data-id');
            words = words.filter(word => word.id !== wordId);
            saveWords();
            renderWords();
        }
    };
    
    /**
     * Handles the export of words to a JSON file.
     */
    const handleExport = () => {
        if (words.length === 0) {
            alert('Nothing to export.');
            return;
        }
        const jsonString = JSON.stringify(words, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `my_words_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * --- MODIFIED --- Handles import, validates the new data structure.
     */
    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Validation for the new structure
                if (!Array.isArray(importedData) || !importedData.every(item => 'id' in item && 'word' in item && 'definition' in item)) {
                    throw new Error('Invalid JSON format. Expected an array of objects with id, word, and definition keys.');
                }
                words = importedData;
                saveWords();
                renderWords();
                alert('Words imported successfully! Existing data has been replaced.');
            } catch (error) {
                alert(`Error importing file: ${error.message}`);
            } finally {
                importFileInput.value = '';
            }
        };
        reader.onerror = () => {
            alert('Error reading the file.');
            importFileInput.value = '';
        };
        reader.readAsText(file);
    };

    /**
     * --- MODIFIED --- Shows a random word and a button to reveal its definition.
     */
    const handleShowRandom = () => {
        wordList.innerHTML = '';
        randomWordDisplayContainer.innerHTML = '';

        if (words.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No words available to show. Add one first!';
            p.style.color = '#888';
            randomWordDisplayContainer.appendChild(p);
            return;
        }

        const randomIndex = Math.floor(Math.random() * words.length);
        currentRandomWord = words[randomIndex]; // Store the selected word object

        const h2 = document.createElement('h2');
        h2.textContent = currentRandomWord.word;
        
        const revealBtn = document.createElement('button');
        revealBtn.textContent = 'Reveal Definition';
        revealBtn.className = 'btn btn-reveal';
        
        revealBtn.addEventListener('click', () => {
            const definitionP = document.createElement('p');
            definitionP.textContent = currentRandomWord.definition;
            randomWordDisplayContainer.appendChild(definitionP);
            revealBtn.remove(); // Remove the button after revealing
        }, { once: true }); // Listener fires only once

        randomWordDisplayContainer.appendChild(h2);
        randomWordDisplayContainer.appendChild(revealBtn);
    };
    
    /**
     * Handles the "List All" button click by re-rendering the full list.
     */
    const handleListAll = () => {
        renderWords();
    };

    // --- INITIALIZATION ---
    addWordForm.addEventListener('submit', handleAddWord);
    wordList.addEventListener('click', handleListClick);
    exportBtn.addEventListener('click', handleExport);
    importFileInput.addEventListener('change', handleImport);
    listAllBtn.addEventListener('click', handleListAll);
    randomWordBtn.addEventListener('click', handleShowRandom);

    loadWords();
    renderWords();
});