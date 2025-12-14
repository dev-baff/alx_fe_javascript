// ========================================
// CONFIGURATION AND CONSTANTS
// ========================================

const STORAGE_KEY = "quotes";
const SESSION_KEY = "lastViewedQuote";
const CATEGORY_FILTER_KEY = "selectedCategory";
const LAST_SYNC_KEY = "lastSyncTime";
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";
const SYNC_INTERVAL = 30000; // 30 seconds

const defaultQuotes = [
  {
    id: 1,
    text: "The only way to do great work is to love what you do.",
    category: "Motivation",
  },
  {
    id: 2,
    text: "Innovation distinguishes between a leader and a follower.",
    category: "Leadership",
  },
  {
    id: 3,
    text: "Life is what happens when you're busy making other plans.",
    category: "Life",
  },
  {
    id: 4,
    text: "The future belongs to those who believe in the beauty of their dreams.",
    category: "Inspiration",
  },
  {
    id: 5,
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    category: "Success",
  },
];

let quotes = [];
let isFormVisible = false;
let isSyncing = false;
let syncInterval = null;
let pendingConflicts = [];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const toggleFormBtn = document.getElementById("toggleForm");
const formContainer = document.getElementById("formContainer");
const categoryFilterSelect = document.getElementById("categoryFilter");
const stats = document.getElementById("stats");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const storageInfo = document.getElementById("storageInfo");
const notificationContainer = document.getElementById("notificationContainer");
const conflictModal = document.getElementById("conflictModal");

// ========================================
// NOTIFICATION SYSTEM
// ========================================

function showNotification(title, message, type = "info") {
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
          <div class="notification-icon">${icons[type]}</div>
          <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
          </div>
        `;

  notificationContainer.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideIn 0.4s ease reverse";
    setTimeout(() => notification.remove(), 400);
  }, 5000);
}

// ========================================
// SERVER SYNC FUNCTIONALITY
// ========================================

function updateSyncStatus(status, message) {
  syncStatus.className = `sync-status ${status}`;
  syncText.textContent = message;

  syncIcon.className = "sync-icon";
  if (status === "syncing") {
    syncIcon.classList.add("syncing");
    syncNowBtn.disabled = true;
  } else if (status === "synced") {
    syncIcon.classList.add("online");
    syncNowBtn.disabled = false;
  } else if (status === "error") {
    syncIcon.classList.add("offline");
    syncNowBtn.disabled = false;
  }
}

async function fetchQuotesFromServer() {
  try {
    const response = await fetch(SERVER_URL);
    if (!response.ok) throw new Error("Server response not ok");

    const posts = await response.json();

    // Transform posts into quote format (simulating server data)
    // Take first 8 posts and convert them
    const serverQuotes = posts.slice(0, 8).map((post) => ({
      id: post.id,
      text: post.title.charAt(0).toUpperCase() + post.title.slice(1) + ".",
      category:
        post.id % 4 === 0
          ? "Technology"
          : post.id % 3 === 0
          ? "Philosophy"
          : post.id % 2 === 0
          ? "Wisdom"
          : "Innovation",
      lastModified: Date.now(),
      source: "server",
    }));

    return serverQuotes;
  } catch (error) {
    console.error("Error fetching from server:", error);
    throw error;
  }
}

function detectConflicts(localQuotes, serverQuotes) {
  const conflicts = [];

  // Check for quotes that exist in both but have different content
  serverQuotes.forEach((serverQuote) => {
    const localMatch = localQuotes.find((q) => q.id === serverQuote.id);

    if (localMatch) {
      // Check if text or category differs
      if (
        localMatch.text !== serverQuote.text ||
        localMatch.category !== serverQuote.category
      ) {
        conflicts.push({
          id: serverQuote.id,
          local: localMatch,
          server: serverQuote,
          type: "modified",
        });
      }
    }
  });

  return conflicts;
}

function mergeQuotes(localQuotes, serverQuotes, resolutions = {}) {
  const merged = [...localQuotes];

  serverQuotes.forEach((serverQuote) => {
    const localIndex = merged.findIndex((q) => q.id === serverQuote.id);

    if (localIndex >= 0) {
      // Conflict resolution: check if there's a manual resolution
      const resolution = resolutions[serverQuote.id];
      if (resolution === "local") {
        // Keep local version
        return;
      } else {
        // Use server version (default strategy)
        merged[localIndex] = { ...serverQuote };
      }
    } else {
      // New quote from server - add it
      merged.push(serverQuote);
    }
  });

  return merged;
}

function showConflictResolutionModal(conflicts) {
  const conflictContent = document.getElementById("conflictContent");
  conflictContent.innerHTML = "";

  conflicts.forEach((conflict, index) => {
    const conflictItem = document.createElement("div");
    conflictItem.className = "conflict-item";
    conflictItem.innerHTML = `
            <div class="conflict-header">
              🔄 Conflict #${index + 1} (Quote ID: ${conflict.id})
            </div>
            <div class="conflict-options">
              <div class="conflict-option" data-id="${
                conflict.id
              }" data-choice="local">
                <div class="conflict-option-label">📱 Keep Local Version</div>
                <div class="conflict-option-text">"${conflict.local.text}"</div>
                <div class="conflict-option-meta">Category: ${
                  conflict.local.category
                }</div>
              </div>
              <div class="conflict-option selected" data-id="${
                conflict.id
              }" data-choice="server">
                <div class="conflict-option-label">☁️ Use Server Version</div>
                <div class="conflict-option-text">"${
                  conflict.server.text
                }"</div>
                <div class="conflict-option-meta">Category: ${
                  conflict.server.category
                }</div>
              </div>
            </div>
          `;
    conflictContent.appendChild(conflictItem);
  });

  // Add click handlers
  document.querySelectorAll(".conflict-option").forEach((option) => {
    option.addEventListener("click", function () {
      const id = this.dataset.id;
      document.querySelectorAll(`[data-id="${id}"]`).forEach((el) => {
        el.classList.remove("selected");
      });
      this.classList.add("selected");
    });
  });

  conflictModal.classList.add("active");
}

function closeConflictModal() {
  conflictModal.classList.remove("active");
  pendingConflicts = [];
}

function applyConflictResolution() {
  const resolutions = {};
  const selectedOptions = document.querySelectorAll(
    ".conflict-option.selected"
  );

  selectedOptions.forEach((option) => {
    const id = parseInt(option.dataset.id);
    const choice = option.dataset.choice;
    resolutions[id] = choice;
  });

  // Fetch server quotes again and merge with resolutions
  fetchQuotesFromServer().then((serverQuotes) => {
    quotes = mergeQuotes(quotes, serverQuotes, resolutions);
    saveQuotes();
    populateCategories();
    updateStats();

    const localCount = Object.values(resolutions).filter(
      (v) => v === "local"
    ).length;
    const serverCount = Object.values(resolutions).filter(
      (v) => v === "server"
    ).length;

    showNotification(
      "Conflicts Resolved",
      `Applied ${localCount} local and ${serverCount} server versions`,
      "success"
    );

    closeConflictModal();
    updateSyncStatus(
      "synced",
      `Last synced: ${new Date().toLocaleTimeString()}`
    );
  });
}

async function syncWithServer() {
  if (isSyncing) {
    showNotification(
      "Sync in Progress",
      "Please wait for current sync to complete",
      "warning"
    );
    return;
  }

  isSyncing = true;
  updateSyncStatus("syncing", "Syncing with server...");

  try {
    const serverQuotes = await fetchQuotesFromServer();
    const conflicts = detectConflicts(quotes, serverQuotes);

    if (conflicts.length > 0) {
      // Store conflicts and show resolution UI
      pendingConflicts = conflicts;
      updateSyncStatus(
        "synced",
        `Sync complete - ${conflicts.length} conflict(s) found`
      );
      showNotification(
        "Conflicts Detected",
        `Found ${conflicts.length} conflict(s). Please resolve them to complete sync.`,
        "warning"
      );
      showConflictResolutionModal(conflicts);
    } else {
      // No conflicts - merge automatically (server takes precedence)
      const beforeCount = quotes.length;
      quotes = mergeQuotes(quotes, serverQuotes);
      const afterCount = quotes.length;
      const newQuotes = afterCount - beforeCount;

      saveQuotes();
      populateCategories();
      updateStats();

      const syncTime = new Date().toLocaleTimeString();
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      updateSyncStatus("synced", `Last synced: ${syncTime}`);

      if (newQuotes > 0) {
        showNotification(
          "Sync Complete",
          `Successfully synced. Added ${newQuotes} new quote(s) from server.`,
          "success"
        );
      } else {
        showNotification(
          "Sync Complete",
          "Your data is up to date with the server.",
          "success"
        );
      }
    }
  } catch (error) {
    updateSyncStatus("error", "Sync failed. Check connection.");
    showNotification(
      "Sync Error",
      "Failed to sync with server. Will retry automatically.",
      "error"
    );
    console.error("Sync error:", error);
  } finally {
    isSyncing = false;
  }
}

function startPeriodicSync() {
  // Clear any existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Start periodic syncing
  syncInterval = setInterval(() => {
    if (!isSyncing && !conflictModal.classList.contains("active")) {
      console.log("Auto-syncing with server...");
      syncWithServer();
    }
  }, SYNC_INTERVAL);

  console.log(`Periodic sync started (every ${SYNC_INTERVAL / 1000} seconds)`);
}

function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("Periodic sync stopped");
  }
}

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
    showNotification(
      "Load Error",
      "Error loading saved quotes. Using defaults.",
      "error"
    );
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
      showNotification(
        "Storage Full",
        "Storage quota exceeded! Unable to save quotes.",
        "error"
      );
    } else {
      showNotification(
        "Save Error",
        "Error saving quotes. Changes may not persist.",
        "error"
      );
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
// CATEGORY FILTERING FUNCTIONS
// ========================================

function populateCategories() {
  const currentValue = categoryFilterSelect.value;
  const categories = [...new Set(quotes.map((q) => q.category))].sort();

  categoryFilterSelect.innerHTML =
    '<option value="all">All Categories</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilterSelect.appendChild(option);
  });

  const savedFilter = localStorage.getItem(CATEGORY_FILTER_KEY);
  if (
    savedFilter &&
    (savedFilter === "all" || categories.includes(savedFilter))
  ) {
    categoryFilterSelect.value = savedFilter;
  } else if (categories.includes(currentValue)) {
    categoryFilterSelect.value = currentValue;
  }
}

function filterQuotes() {
  const selectedCategory = categoryFilterSelect.value;
  localStorage.setItem(CATEGORY_FILTER_KEY, selectedCategory);
  updateStats();
  showRandomQuote();
}

function getFilteredQuotes() {
  const selectedCategory = categoryFilterSelect.value;
  return selectedCategory === "all"
    ? quotes
    : quotes.filter((q) => q.category === selectedCategory);
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
    showNotification(
      "Export Complete",
      "Quotes exported successfully",
      "success"
    );
  } catch (error) {
    console.error("Error exporting quotes:", error);
    showNotification(
      "Export Error",
      "Error exporting quotes. Please try again.",
      "error"
    );
  }
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".json")) {
    showNotification(
      "Invalid File",
      "Please select a valid JSON file.",
      "error"
    );
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

      // Assign IDs to imported quotes if they don't have them
      let maxId = Math.max(0, ...quotes.map((q) => q.id || 0));
      validQuotes.forEach((q) => {
        if (!q.id) {
          q.id = ++maxId;
        }
      });

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
      populateCategories();
      updateStats();
      showNotification(
        "Import Complete",
        `Successfully imported ${validQuotes.length} quotes!`,
        "success"
      );
      importFile.value = "";
    } catch (error) {
      console.error("Error importing quotes:", error);
      showNotification("Import Error", `Error: ${error.message}`, "error");
      importFile.value = "";
    }
  };

  fileReader.onerror = function () {
    showNotification(
      "Read Error",
      "Error reading file. Please try again.",
      "error"
    );
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
    const selectedCategory = localStorage.getItem(CATEGORY_FILTER_KEY) || "all";
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    const syncTime = lastSync
      ? new Date(parseInt(lastSync)).toLocaleString()
      : "Never";

    storageInfo.innerHTML = `
            <strong>💾 Storage Info:</strong> 
            ${quotes.length} quotes (${sizeKB} KB) | 
            Filter: ${selectedCategory} | 
            Last sync: ${syncTime}
          `;
  } catch (error) {
    storageInfo.innerHTML =
      "<strong>💾 Storage Info:</strong> Unable to calculate";
  }
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

function updateStats() {
  const filteredQuotes = getFilteredQuotes();
  const selectedCategory = categoryFilterSelect.value;
  stats.textContent = `${filteredQuotes.length} quotes available${
    selectedCategory !== "all" ? " in " + selectedCategory : ""
  }`;
}

// ========================================
// CORE FUNCTIONALITY
// ========================================

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
  title.textContent = "✍️ Add New Quote";
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
  addBtn.textContent = "✅ Add Quote";
  addBtn.addEventListener("click", addQuote);
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "❌ Cancel";
  cancelBtn.addEventListener("click", toggleAddQuoteForm);
  actionsDiv.appendChild(addBtn);
  actionsDiv.appendChild(cancelBtn);
  formDiv.appendChild(actionsDiv);
  formContainer.appendChild(formDiv);
  toggleFormBtn.textContent = "❌ Cancel";
  textInput.focus();
}

function hideAddQuoteForm() {
  formContainer.innerHTML = "";
  toggleFormBtn.textContent = "➕ Add New Quote";
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");
  const quoteText = textInput.value.trim();
  const quoteCategory = categoryInput.value.trim();

  if (!quoteText) {
    showNotification("Missing Text", "Please enter a quote text", "warning");
    textInput.focus();
    return;
  }
  if (!quoteCategory) {
    showNotification("Missing Category", "Please enter a category", "warning");
    categoryInput.focus();
    return;
  }

  // Generate new ID
  const maxId = Math.max(0, ...quotes.map((q) => q.id || 0));
  const newQuote = {
    id: maxId + 1,
    text: quoteText,
    category: quoteCategory,
    lastModified: Date.now(),
    source: "local",
  };

  quotes.push(newQuote);
  saveQuotes();
  populateCategories();
  updateStats();
  hideAddQuoteForm();
  isFormVisible = false;
  categoryFilterSelect.value = quoteCategory;
  localStorage.setItem(CATEGORY_FILTER_KEY, quoteCategory);
  showRandomQuote();
  showNotification(
    "Quote Added",
    "Your quote has been added successfully",
    "success"
  );
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
  loadQuotes();
  populateCategories();
  loadLastViewedQuote();
  updateStats();
  updateStorageInfo();

  // Initialize server sync
  updateSyncStatus("syncing", "Initializing connection...");
  setTimeout(() => {
    syncWithServer();
    startPeriodicSync();
  }, 2000);

  newQuoteBtn.addEventListener("click", showRandomQuote);
  toggleFormBtn.addEventListener("click", toggleAddQuoteForm);
  exportBtn.addEventListener("click", exportToJson);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importFromJsonFile);

  showNotification(
    "Welcome",
    "Quote Generator loaded. Auto-sync enabled.",
    "info"
  );
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopPeriodicSync();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
