// ========================================
// STORAGE KEYS AND DEFAULT DATA
// ========================================

const STORAGE_KEY = "quotes";
const SESSION_KEY = "lastViewedQuote";

const defaultQuotes = [
  {
    text: "The only way to do great work is to love what you do.",
    category: "Motivation",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    category: "Leadership",
  },
  {
    text: "Life is what happens when you're busy making other plans.",
    category: "Life",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    category: "Inspiration",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    category: "Success",
  },
  {
    text: "The only impossible journey is the one you never begin.",
    category: "Motivation",
  },
  {
    text: "Leadership is not about being in charge. It's about taking care of those in your charge.",
    category: "Leadership",
  },
  {
    text: "In the end, we only regret the chances we didn't take.",
    category: "Life",
  },
  {
    text: "Believe you can and you're halfway there.",
    category: "Inspiration",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    category: "Success",
  },
];

let quotes = [];
let currentCategory = "All";
let isFormVisible = false;

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const toggleFormBtn = document.getElementById("toggleForm");
const formContainer = document.getElementById("formContainer");
const categoryFilter = document.getElementById("categoryFilter");
const stats = document.getElementById("stats");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const clearBtn = document.getElementById("clearBtn");
const importFile = document.getElementById("importFile");
const storageInfo = document.getElementById("storageInfo");

// ========================================
// LOCAL STORAGE FUNCTIONS
// ========================================

function loadQuotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      quotes = JSON.parse(stored);
      console.log(`Loaded ${quotes.length} quotes from localStorage`);
    } else {
      quotes = [...defaultQuotes];
      saveQuotes();
      console.log("Initialized with default quotes");
    }
  } catch (error) {
    console.error("Error loading quotes:", error);
    quotes = [...defaultQuotes];
    alert("Error loading saved quotes. Using default quotes.");
  }
}

function saveQuotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    updateStorageInfo();
    console.log(`Saved ${quotes.length} quotes to localStorage`);
  } catch (error) {
    console.error("Error saving quotes:", error);
    if (error.name === "QuotaExceededError") {
      alert("Storage quota exceeded! Unable to save quotes.");
    } else {
      alert("Error saving quotes. Changes may not persist.");
    }
  }
}

function clearAllQuotes() {
  if (
    confirm(
      "Are you sure you want to delete all quotes? This action cannot be undone."
    )
  ) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      quotes = [...defaultQuotes];
      saveQuotes();
      currentCategory = "All";
      renderCategoryFilter();
      updateStats();
      quoteDisplay.innerHTML =
        '<div class="empty-state">All quotes cleared. Default quotes restored.</div>';
      alert("All quotes cleared successfully!");
    } catch (error) {
      console.error("Error clearing quotes:", error);
      alert("Error clearing quotes.");
    }
  }
}

// ========================================
// SESSION STORAGE FUNCTIONS
// ========================================

function saveLastViewedQuote(quote) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(quote));
  } catch (error) {
    console.error("Error saving to sessionStorage:", error);
  }
}

function loadLastViewedQuote() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const quote = JSON.parse(stored);
      displayQuote(quote);
      console.log("Restored last viewed quote from session");
    }
  } catch (error) {
    console.error("Error loading from sessionStorage:", error);
  }
}

// ========================================
// JSON IMPORT/EXPORT FUNCTIONS
// ========================================

function exportToJson() {
  try {
    const jsonString = JSON.stringify(quotes, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `quotes-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback(exportBtn, "✓ Exported!", "#28a745");
    console.log("Quotes exported successfully");
  } catch (error) {
    console.error("Error exporting quotes:", error);
    alert("Error exporting quotes. Please try again.");
  }
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".json")) {
    alert("Please select a valid JSON file.");
    return;
  }

  const fileReader = new FileReader();

  fileReader.onload = function (e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);

      if (!Array.isArray(importedQuotes)) {
        throw new Error("Invalid format: Expected an array of quotes");
      }

      const validQuotes = importedQuotes.filter((q) => {
        return (
          q &&
          typeof q === "object" &&
          typeof q.text === "string" &&
          q.text.trim() !== "" &&
          typeof q.category === "string" &&
          q.category.trim() !== ""
        );
      });

      if (validQuotes.length === 0) {
        throw new Error("No valid quotes found in file");
      }

      const replace = confirm(
        `Found ${validQuotes.length} valid quotes.\n\n` +
          `Click OK to REPLACE existing quotes.\n` +
          `Click Cancel to MERGE with existing quotes.`
      );

      if (replace) {
        quotes = validQuotes;
      } else {
        validQuotes.forEach((newQuote) => {
          const isDuplicate = quotes.some(
            (q) => q.text === newQuote.text && q.category === newQuote.category
          );
          if (!isDuplicate) {
            quotes.push(newQuote);
          }
        });
      }

      saveQuotes();
      currentCategory = "All";
      renderCategoryFilter();
      updateStats();
      alert(`Successfully imported ${validQuotes.length} quotes!`);
      showFeedback(importBtn, "✓ Imported!", "#28a745");
      importFile.value = "";
    } catch (error) {
      console.error("Error importing quotes:", error);
      alert(`Error importing quotes: ${error.message}`);
      importFile.value = "";
    }
  };

  fileReader.onerror = function () {
    alert("Error reading file. Please try again.");
    importFile.value = "";
  };

  fileReader.readAsText(file);
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================

function updateStorageInfo() {
  try {
    const quotesSize = new Blob([localStorage.getItem(STORAGE_KEY)]).size;
    const sizeKB = (quotesSize / 1024).toFixed(2);
    storageInfo.innerHTML = `
          <strong>Storage Info:</strong> 
          ${quotes.length} quotes saved (${sizeKB} KB in localStorage) | 
          Last viewed quote stored in sessionStorage
        `;
  } catch (error) {
    storageInfo.innerHTML =
      "<strong>Storage Info:</strong> Unable to calculate storage size";
  }
}

function showFeedback(button, text, color) {
  const originalText = button.textContent;
  const originalColor = button.style.background;
  button.textContent = text;
  button.style.background = color;
  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = originalColor;
  }, 2000);
}

function displayQuote(quote) {
  quoteDisplay.innerHTML = "";
  const quoteText = document.createElement("div");
  quoteText.className = "quote-text";
  quoteText.textContent = `"${quote.text}"`;
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "quote-category";
  categoryBadge.textContent = quote.category;
  quoteDisplay.appendChild(quoteText);
  quoteDisplay.appendChild(categoryBadge);
  quoteDisplay.style.opacity = "0";
  setTimeout(() => {
    quoteDisplay.style.transition = "opacity 0.5s ease";
    quoteDisplay.style.opacity = "1";
  }, 10);
}

// ========================================
// CORE FUNCTIONALITY
// ========================================

function getCategories() {
  const categories = quotes.map((q) => q.category);
  return ["All", ...new Set(categories)];
}

function renderCategoryFilter() {
  categoryFilter.innerHTML = "";
  const categories = getCategories();
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.textContent = cat;
    if (cat === currentCategory) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentCategory = cat;
      renderCategoryFilter();
      showRandomQuote();
    });
    categoryFilter.appendChild(btn);
  });
}

function updateStats() {
  const filteredQuotes = getFilteredQuotes();
  stats.textContent = `${filteredQuotes.length} quotes available${
    currentCategory !== "All" ? " in " + currentCategory : ""
  }`;
}

function getFilteredQuotes() {
  if (currentCategory === "All") {
    return quotes;
  }
  return quotes.filter((q) => q.category === currentCategory);
}

function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML =
      '<div class="empty-state">No quotes available in this category</div>';
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  displayQuote(quote);
  saveLastViewedQuote(quote);
}

function toggleAddQuoteForm() {
  if (isFormVisible) {
    hideAddQuoteForm();
  } else {
    createAddQuoteForm();
  }
  isFormVisible = !isFormVisible;
}

function createAddQuoteForm() {
  formContainer.innerHTML = "";
  const formDiv = document.createElement("div");
  formDiv.className = "add-quote-form";
  const title = document.createElement("div");
  title.className = "form-title";
  title.textContent = "Add New Quote";
  formDiv.appendChild(title);

  const textGroup = document.createElement("div");
  textGroup.className = "form-group";
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.id = "newQuoteText";
  textInput.placeholder = "Enter a new quote";
  textGroup.appendChild(textInput);
  formDiv.appendChild(textGroup);

  const categoryGroup = document.createElement("div");
  categoryGroup.className = "form-group";
  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";
  categoryGroup.appendChild(categoryInput);
  formDiv.appendChild(categoryGroup);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "form-actions";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Quote";
  addBtn.addEventListener("click", addQuote);
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", toggleAddQuoteForm);
  actionsDiv.appendChild(addBtn);
  actionsDiv.appendChild(cancelBtn);
  formDiv.appendChild(actionsDiv);
  formContainer.appendChild(formDiv);
  toggleFormBtn.textContent = "Cancel";
  textInput.focus();
}

function hideAddQuoteForm() {
  formContainer.innerHTML = "";
  toggleFormBtn.textContent = "Add New Quote";
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");
  const quoteText = textInput.value.trim();
  const quoteCategory = categoryInput.value.trim();

  if (!quoteText) {
    alert("Please enter a quote text");
    textInput.focus();
    return;
  }
  if (!quoteCategory) {
    alert("Please enter a category");
    categoryInput.focus();
    return;
  }

  const newQuote = { text: quoteText, category: quoteCategory };
  quotes.push(newQuote);
  saveQuotes();
  renderCategoryFilter();
  updateStats();
  hideAddQuoteForm();
  isFormVisible = false;
  currentCategory = quoteCategory;
  renderCategoryFilter();
  showRandomQuote();
  showFeedback(newQuoteBtn, "✓ Quote Added!", "#28a745");
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
  loadQuotes();
  loadLastViewedQuote();
  renderCategoryFilter();
  updateStats();
  updateStorageInfo();
  newQuoteBtn.addEventListener("click", showRandomQuote);
  toggleFormBtn.addEventListener("click", toggleAddQuoteForm);
  exportBtn.addEventListener("click", exportToJson);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importFromJsonFile);
  clearBtn.addEventListener("click", clearAllQuotes);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
