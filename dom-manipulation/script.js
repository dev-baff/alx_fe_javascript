// Quote data structure
let quotes = [
  { text: "The only way to do great work is to love what you do.", category: "Motivation" },
  { text: "Innovation distinguishes between a leader and a follower.", category: "Leadership" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", category: "Inspiration" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Success" },
  { text: "The only impossible journey is the one you never begin.", category: "Motivation" },
  { text: "Leadership is not about being in charge. It's about taking care of those in your charge.", category: "Leadership" },
  { text: "In the end, we only regret the chances we didn't take.", category: "Life" },
  { text: "Believe you can and you're halfway there.", category: "Inspiration" },
  { text: "Don't watch the clock; do what it does. Keep going.", category: "Success" }
];

// State management
let currentCategory = "All";
let isFormVisible = false;

// DOM Elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const toggleFormBtn = document.getElementById('toggleForm');
const formContainer = document.getElementById('formContainer');
const categoryFilter = document.getElementById('categoryFilter');
const stats = document.getElementById('stats');

// Initialize the application
function init() {
  renderCategoryFilter();
  updateStats();
  
  // Event listeners
  newQuoteBtn.addEventListener('click', showRandomQuote);
  toggleFormBtn.addEventListener('click', toggleAddQuoteForm);
}

// Get all unique categories
function getCategories() {
  const categories = quotes.map(q => q.category);
  return ['All', ...new Set(categories)];
}

// Render category filter buttons
function renderCategoryFilter() {
  // Clear existing filters
  categoryFilter.innerHTML = '';
  
  const categories = getCategories();
  
  categories.forEach(cat => {
    // Create button element
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat;
    
    // Add active class if current category
    if (cat === currentCategory) {
      btn.classList.add('active');
    }
    
    // Add click event listener
    btn.addEventListener('click', () => {
      currentCategory = cat;
      renderCategoryFilter();
      showRandomQuote();
    });
    
    // Append to filter container
    categoryFilter.appendChild(btn);
  });
}

// Update statistics display
function updateStats() {
  const filteredQuotes = getFilteredQuotes();
  stats.textContent = `${filteredQuotes.length} quotes available${currentCategory !== 'All' ? ' in ' + currentCategory : ''}`;
}

// Get filtered quotes based on current category
function getFilteredQuotes() {
  if (currentCategory === 'All') {
    return quotes;
  }
  return quotes.filter(q => q.category === currentCategory);
}

// Show a random quote from filtered quotes
function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  
  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = '<div class="empty-state">No quotes available in this category</div>';
    return;
  }
  
  // Get random quote
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  
  // Clear existing content
  quoteDisplay.innerHTML = '';
  
  // Create quote text element
  const quoteText = document.createElement('div');
  quoteText.className = 'quote-text';
  quoteText.textContent = `"${quote.text}"`;
  
  // Create category badge element
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'quote-category';
  categoryBadge.textContent = quote.category;
  
  // Append elements to display
  quoteDisplay.appendChild(quoteText);
  quoteDisplay.appendChild(categoryBadge);
  
  // Add fade-in animation
  quoteDisplay.style.opacity = '0';
  setTimeout(() => {
    quoteDisplay.style.transition = 'opacity 0.5s ease';
    quoteDisplay.style.opacity = '1';
  }, 10);
}

// Toggle the add quote form visibility
function toggleAddQuoteForm() {
  if (isFormVisible) {
    hideAddQuoteForm();
  } else {
    createAddQuoteForm();
  }
  isFormVisible = !isFormVisible;
}

// Create and display the add quote form
function createAddQuoteForm() {
  // Clear existing content
  formContainer.innerHTML = '';
  
  // Create form wrapper
  const formDiv = document.createElement('div');
  formDiv.className = 'add-quote-form';
  
  // Create form title
  const title = document.createElement('div');
  title.className = 'form-title';
  title.textContent = 'Add New Quote';
  formDiv.appendChild(title);
  
  // Create quote text input group
  const textGroup = document.createElement('div');
  textGroup.className = 'form-group';
  
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.id = 'newQuoteText';
  textInput.placeholder = 'Enter a new quote';
  
  textGroup.appendChild(textInput);
  formDiv.appendChild(textGroup);
  
  // Create category input group
  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-group';
  
  const categoryInput = document.createElement('input');
  categoryInput.type = 'text';
  categoryInput.id = 'newQuoteCategory';
  categoryInput.placeholder = 'Enter quote category';
  
  categoryGroup.appendChild(categoryInput);
  formDiv.appendChild(categoryGroup);
  
  // Create form actions
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'form-actions';
  
  // Create add button
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Quote';
  addBtn.addEventListener('click', addQuote);
  
  // Create cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', toggleAddQuoteForm);
  
  actionsDiv.appendChild(addBtn);
  actionsDiv.appendChild(cancelBtn);
  formDiv.appendChild(actionsDiv);
  
  // Append form to container
  formContainer.appendChild(formDiv);
  
  // Update toggle button text
  toggleFormBtn.textContent = 'Cancel';
  
  // Focus on first input
  textInput.focus();
}

// Hide the add quote form
function hideAddQuoteForm() {
  formContainer.innerHTML = '';
  toggleFormBtn.textContent = 'Add New Quote';
}

// Add a new quote to the collection
function addQuote() {
  const textInput = document.getElementById('newQuoteText');
  const categoryInput = document.getElementById('newQuoteCategory');
  
  const quoteText = textInput.value.trim();
  const quoteCategory = categoryInput.value.trim();
  
  // Validation
  if (!quoteText) {
    alert('Please enter a quote text');
    textInput.focus();
    return;
  }
  
  if (!quoteCategory) {
    alert('Please enter a category');
    categoryInput.focus();
    return;
  }
  
  // Create new quote object
  const newQuote = {
    text: quoteText,
    category: quoteCategory
  };
  
  // Add to quotes array
  quotes.push(newQuote);
  
  // Update UI
  renderCategoryFilter();
  updateStats();
  hideAddQuoteForm();
  isFormVisible = false;
  
  // Set current category to the new quote's category and display it
  currentCategory = quoteCategory;
  renderCategoryFilter();
  showRandomQuote();
  
  // Show success feedback
  const originalText = newQuoteBtn.textContent;
  newQuoteBtn.textContent = '✓ Quote Added!';
  newQuoteBtn.style.background = '#28a745';
  
  setTimeout(() => {
    newQuoteBtn.textContent = originalText;
    newQuoteBtn.style.background = '';
  }, 2000);
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}