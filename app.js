document.addEventListener('DOMContentLoaded', () => {
    // --- STATE AND CONSTANTS ---
    // --- MODIFIED --- Changed STORAGE_KEY to avoid conflict with old JSON data
    const STORAGE_KEY = 'serverlessWordsCSV'; 
    let words = [];
    let currentRandomWord = null;

    // --- DOM ELEMENT REFERENCES ---
    const addWordForm = document.getElementById('add-word-form');
    const wordInput = document.getElementById('word-input');
    const definitionInput = document.getElementById('definition-input');
    const wordList = document.getElementById('word-list');
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file-input');
    const listAllBtn = document.getElementById('list-all-btn');
    const randomWordBtn = document.getElementById('random-word-btn');
    const randomWordDisplayContainer = document.getElementById('random-word-display-container');

    // --- CSV HELPER FUNCTIONS ---

    /**
     * Escapes a field for CSV by enclosing it in double quotes if it contains
     * commas, double quotes, or newlines. Internal double quotes are doubled.
     * @param {string} field The string to escape.
     * @returns {string} The CSV-escaped string.
     */
    function escapeCsvField(field) {
        if (field == null) field = ''; // Handle null/undefined fields
        field = String(field); // Ensure it's a string

        // Check if the field needs quotes (contains comma, double quote, newline, or carriage return)
        const needsQuotes = field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r');
        
        // Escape internal double quotes by doubling them
        const escapedField = field.replace(/"/g, '""');

        return needsQuotes ? `"${escapedField}"` : escapedField;
    }

    /**
     * Converts an array of word objects into a CSV string.
     * Includes a header row: "word,definition".
     * @param {Array<Object>} wordsArray The array of word objects.
     * @returns {string} The CSV formatted string.
     */
    function wordsToCsv(wordsArray) {
        const header = 'word,definition'; // Standard CSV header
        const lines = wordsArray.map(entry => {
            const word = escapeCsvField(entry.word);
            const definition = escapeCsvField(entry.definition);
            return `${word},${definition}`;
        });
        return [header, ...lines].join('\n');
    }

    /**
     * Parses a single CSV line with two fields (word, definition).
     * Handles quoted fields and escaped double quotes ("").
     * @param {string} line The CSV line to parse.
     * @returns {Object|null} An object { word: string, definition: string } or null if line is empty.
     */
    function parseTwoFieldCsvLine(line) {
        let fields = [];
        let currentField = '';
        let inQuote = false;

        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return null;

        for (let i = 0; i < trimmedLine.length; i++) {
            const char = trimmedLine[i];
            const nextChar = trimmedLine[i + 1];

            if (char === '"') {
                if (inQuote && nextChar === '"') { // Escaped double quote ("" becomes ")
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    inQuote = !inQuote; // Toggle quote state
                }
            } else if (char === ',' && !inQuote) {
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField); // Add the last field

        // Unescape internal double quotes and trim whitespace
        const parsedWord = fields[0] ? fields[0].replace(/""/g, '"').trim() : '';
        const parsedDefinition = fields[1] ? fields[1].replace(/""/g, '"').trim() : '';

        return { word: parsedWord, definition: parsedDefinition };
    }

    /**
     * Converts a CSV string into an array of word objects.
     * Generates new IDs and creation dates for imported words.
     * @param {string} csvString The CSV data string.
     * @returns {Array<Object>} An array of word objects.
     */
    function csvToWords(csvString) {
        // Split by newline, handle Windows/Unix, and filter out empty lines
        const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== ''); 
        
        // Optionally skip header row if it matches "word,definition" case-insensitively
        if (lines.length > 0 && lines[0].toLowerCase().trim() === 'word,definition') {
            lines.shift(); // Remove header line
        }

        return lines.map(line => {
            const parsed = parseTwoFieldCsvLine(line);
            // Ensure parsed object is valid and has expected properties
            if (parsed && parsed.word !== undefined && parsed.definition !== undefined) {
                return {
                    id: crypto.randomUUID(), // Generate new unique ID
                    word: parsed.word,
                    definition: parsed.definition,
                    createdAt: new Date().toISOString(), // Set current timestamp
                };
            }
            return null; // Skip invalid lines
        }).filter(Boolean); // Filter out any nulls resulting from invalid lines
    }

    // --- CORE FUNCTIONS ---

    /**
     * Renders the list of words and definitions.
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
     * Handles form submission to add a new word and definition.
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
     * --- MODIFIED --- Handles the export of words to a CSV file.
     */
    const handleExport = () => {
        if (words.length === 0) {
            alert('Nothing to export.');
            return;
        }
        // --- MODIFIED --- Convert words array to CSV string
        const csvString = wordsToCsv(words);
        const blob = new Blob([csvString], { type: 'text/csv' }); // --- MODIFIED --- Set MIME type for CSV
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `my_words_${date}.csv`; // --- MODIFIED --- Change file extension to .csv
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * --- MODIFIED --- Handles import from CSV, validates the new data structure.
     */
    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // --- MODIFIED --- Parse CSV string to words array
                const importedData = csvToWords(e.target.result);
                
                // Validation for the new structure: check for 'word' and 'definition'
                if (!Array.isArray(importedData) || importedData.length === 0 || !importedData.every(item => 'word' in item && 'definition' in item)) {
                    throw new Error('Invalid CSV format. Expected a list of "word,definition" pairs.');
                }
                words = importedData; // Replace existing words with imported ones
                saveWords();
                renderWords();
                alert(`Successfully imported ${importedData.length} words! Existing data has been replaced.`);
            } catch (error) {
                alert(`Error importing file: ${error.message}`);
            } finally {
                importFileInput.value = ''; // Clear file input
            }
        };
        reader.onerror = () => {
            alert('Error reading the file.');
            importFileInput.value = '';
        };
        reader.readAsText(file);
    };

    /**
     * Shows a random word and a button to reveal its definition.
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