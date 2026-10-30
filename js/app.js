/**
 * ================================================================
 * Expense & Budget Visualizer — app.js
 * ================================================================
 * Sections:
 *  1. Constants & Config
 *  2. State
 *  3. DOM References
 *  4. Initialisation
 *  5. Event Listeners
 *  6. Form Validation
 *  7. Transaction Management  (add / delete)
 *  8. LocalStorage            (load / save)
 *  9. Render Orchestrator
 * 10. Render — Balance
 * 11. Render — Transaction List
 * 12. Render — Pie Chart
 * 13. Utility Helpers
 * ================================================================
 */

/* ── 1. Constants & Config ───────────────────────────────────── */

const STORAGE_KEY = 'ebv_transactions';

/** Maps each category to its Chart.js / badge colour */
const CATEGORY_CONFIG = {
  Food:      { color: '#f59e0b', label: 'Food'      },
  Transport: { color: '#3b82f6', label: 'Transport' },
  Fun:       { color: '#10b981', label: 'Fun'       },
};

/* ── 2. State ────────────────────────────────────────────────── */

/** @type {{ id: string, name: string, amount: number, category: string }[]} */
let transactions = loadTransactions();

/** Holds the active Chart.js instance so we can destroy before re-render */
let chartInstance = null;

/* ── 3. DOM References ───────────────────────────────────────── */

const formEl        = document.getElementById('expense-form');
const inputName     = document.getElementById('item-name');
const inputAmount   = document.getElementById('amount');
const inputCategory = document.getElementById('category');
const errName       = document.getElementById('err-name');
const errAmount     = document.getElementById('err-amount');
const errCategory   = document.getElementById('err-category');
const totalEl       = document.getElementById('total-balance');
const listEl        = document.getElementById('transaction-list');
const listEmptyEl   = document.getElementById('list-empty');
const chartCanvas   = document.getElementById('expense-chart');
const chartEmptyEl  = document.getElementById('chart-empty');

/* ── 4. Initialisation ───────────────────────────────────────── */

// Render UI from persisted data as soon as the script runs
render();

/* ── 5. Event Listeners ──────────────────────────────────────── */

// Form submission
formEl.addEventListener('submit', handleFormSubmit);

// Delete buttons — event delegation on the list container
listEl.addEventListener('click', handleDeleteClick);

// Clear inline errors as soon as user starts correcting a field
inputName.addEventListener('input',    () => clearFieldError(inputName,     errName));
inputAmount.addEventListener('input',  () => clearFieldError(inputAmount,   errAmount));
inputCategory.addEventListener('change', () => clearFieldError(inputCategory, errCategory));

/* ── 6. Form Validation ──────────────────────────────────────── */

/**
 * Validates all form fields.
 * Marks invalid fields with `.invalid` class and shows inline error messages.
 * @returns {boolean} true if all fields are valid
 */
function validate() {
  let isValid = true;

  // ── Item Name ──────────────────────────────────────────────
  const nameVal = inputName.value.trim();
  if (!nameVal) {
    showFieldError(inputName, errName, 'Item name is required.');
    isValid = false;
  } else if (nameVal.length > 60) {
    showFieldError(inputName, errName, 'Name must be 60 characters or fewer.');
    isValid = false;
  }

  // ── Amount ─────────────────────────────────────────────────
  const amountVal = parseFloat(inputAmount.value);
  if (inputAmount.value === '' || isNaN(amountVal)) {
    showFieldError(inputAmount, errAmount, 'Amount is required.');
    isValid = false;
  } else if (amountVal <= 0) {
    showFieldError(inputAmount, errAmount, 'Amount must be greater than $0.00.');
    isValid = false;
  } else if (amountVal > 1_000_000) {
    showFieldError(inputAmount, errAmount, 'Amount cannot exceed $1,000,000.');
    isValid = false;
  }

  // ── Category ───────────────────────────────────────────────
  if (!inputCategory.value) {
    showFieldError(inputCategory, errCategory, 'Please select a category.');
    isValid = false;
  }

  return isValid;
}

/**
 * Marks a field as invalid and shows an error message.
 * @param {HTMLElement} field
 * @param {HTMLElement} errEl
 * @param {string}      message
 */
function showFieldError(field, errEl, message) {
  field.classList.add('invalid');
  errEl.textContent = message;
}

/**
 * Clears the error state for a single field.
 * @param {HTMLElement} field
 * @param {HTMLElement} errEl
 */
function clearFieldError(field, errEl) {
  field.classList.remove('invalid');
  errEl.textContent = '';
}

/** Clears all field errors at once (used before re-validation). */
function clearAllErrors() {
  clearFieldError(inputName,     errName);
  clearFieldError(inputAmount,   errAmount);
  clearFieldError(inputCategory, errCategory);
}

/* ── 7. Transaction Management ───────────────────────────────── */

/**
 * Handles form submit: validates, creates a transaction, persists, renders.
 * @param {SubmitEvent} e
 */
function handleFormSubmit(e) {
  e.preventDefault();
  clearAllErrors();

  if (!validate()) return;

  const newTransaction = {
    id:       generateId(),
    name:     inputName.value.trim(),
    amount:   roundToTwoDecimals(parseFloat(inputAmount.value)),
    category: inputCategory.value,
    createdAt: Date.now(),
  };

  addTransaction(newTransaction);
}

/**
 * Adds a transaction to state, persists it, and refreshes the UI.
 * @param {{ id: string, name: string, amount: number, category: string, createdAt: number }} tx
 */
function addTransaction(tx) {
  transactions.push(tx);
  saveTransactions();
  render();
  formEl.reset();
  clearAllErrors();
  // Return focus to first field for quick consecutive entry
  inputName.focus();
}

/**
 * Handles click on delete buttons via event delegation.
 * @param {MouseEvent} e
 */
function handleDeleteClick(e) {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  deleteTransaction(id);
}

/**
 * Removes a transaction by ID, persists the change, and refreshes the UI.
 * @param {string} id
 */
function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  render();
}

/* ── 8. LocalStorage ─────────────────────────────────────────── */

/**
 * Loads and parses transactions from localStorage.
 * Returns an empty array if nothing is stored or data is corrupt.
 * @returns {Array}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Guard: ensure it's an array of objects with required fields
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      t => t && typeof t.id === 'string' &&
           typeof t.name === 'string' &&
           typeof t.amount === 'number' &&
           typeof t.category === 'string'
    );
  } catch {
    // JSON parse error — return clean state
    return [];
  }
}

/**
 * Serialises and persists the current transactions array to localStorage.
 */
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/* ── 9. Render Orchestrator ──────────────────────────────────── */

/**
 * Master render function — calls all sub-renderers.
 * Always call this after any state change.
 */
function render() {
  renderBalance();
  renderList();
  renderChart();
}

/* ── 10. Render — Balance ────────────────────────────────────── */

/**
 * Recalculates and displays the total balance from all transactions.
 */
function renderBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  totalEl.textContent = formatCurrency(total);
}

/* ── 11. Render — Transaction List ──────────────────────────── */

/**
 * Rebuilds the transaction list DOM (newest → oldest).
 * Shows an empty-state message when there are no transactions.
 */
function renderList() {
  // Clear existing rows
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    listEmptyEl.style.display = 'block';
    return;
  }

  listEmptyEl.style.display = 'none';

  // Render newest first (reverse without mutating state)
  [...transactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach(tx => {
      const li = buildTransactionRow(tx);
      listEl.appendChild(li);
    });
}

/**
 * Creates a single transaction list item element.
 * @param {{ id: string, name: string, amount: number, category: string }} tx
 * @returns {HTMLLIElement}
 */
function buildTransactionRow(tx) {
  const li = document.createElement('li');
  li.className = 'transaction-item';
  li.dataset.id = tx.id;

  const safeName = escHtml(tx.name);

  li.innerHTML = `
    <span class="tx-name" title="${safeName}">${safeName}</span>
    <span class="tx-badge badge-${tx.category}">${tx.category}</span>
    <span class="tx-amount">${formatCurrency(tx.amount)}</span>
    <button
      class="btn-delete"
      data-id="${tx.id}"
      aria-label="Delete transaction: ${safeName}"
      title="Delete"
    >&#x2715;</button>
  `;

  return li;
}

/* ── 12. Render — Pie Chart ──────────────────────────────────── */

/**
 * Aggregates transaction amounts by category and re-renders the pie chart.
 * Destroys the previous Chart.js instance before creating a new one.
 */
function renderChart() {
  // Aggregate totals per category
  const totals = aggregateByCategory(transactions);
  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => (CATEGORY_CONFIG[l] || {}).color || '#94a3b8');

  const hasData = labels.length > 0;

  // Toggle empty-state message vs. canvas
  chartEmptyEl.style.display = hasData ? 'none'  : 'block';
  chartCanvas.style.display  = hasData ? 'block' : 'none';

  // Destroy existing chart to avoid canvas reuse errors
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (!hasData) return;

  chartInstance = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      animation: { duration: 400 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 13, weight: '600' },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            /**
             * Shows both the formatted amount and its percentage of the total.
             * @param {import('chart.js').TooltipItem} ctx
             */
            label(ctx) {
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
              return `  ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Sums transaction amounts grouped by category.
 * @param {Array} txList
 * @returns {{ [category: string]: number }}
 */
function aggregateByCategory(txList) {
  return txList.reduce((acc, tx) => {
    acc[tx.category] = roundToTwoDecimals((acc[tx.category] || 0) + tx.amount);
    return acc;
  }, {});
}

/* ── 13. Utility Helpers ─────────────────────────────────────── */

/**
 * Formats a number as a USD currency string, e.g. $1,234.56
 * @param {number} n
 * @returns {string}
 */
function formatCurrency(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Escapes special HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Rounds a float to two decimal places to avoid floating-point drift.
 * @param {number} n
 * @returns {number}
 */
function roundToTwoDecimals(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Generates a unique string ID based on timestamp + random suffix.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
