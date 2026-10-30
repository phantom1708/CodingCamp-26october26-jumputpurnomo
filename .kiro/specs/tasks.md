# Expense & Budget Visualizer — Task Breakdown

## Project Constraints
- Pure HTML5 / CSS3 / Vanilla JS (no frameworks)
- LocalStorage for persistence
- Chart.js via CDN for pie chart
- Single CSS file: `css/style.css`
- Single JS file: `js/app.js`

---

## Tasks

### T-1: Project Scaffold
- [x] Create `index.html` with semantic structure
- [x] Link `css/style.css` and Chart.js CDN
- [x] Link `js/app.js` at bottom of body

### T-2: Input Form
- [x] Fields: Item Name (text), Amount (number), Category (select: Food / Transport / Fun)
- [x] Client-side validation — all fields required before submit
- [x] On submit: create transaction object, save to LocalStorage, refresh UI

### T-3: Transaction List
- [x] Scrollable list container
- [x] Each row: item name, category badge, amount, delete button
- [x] Delete removes item from LocalStorage and refreshes UI

### T-4: Total Balance
- [x] Computed from all stored transactions
- [x] Updates automatically after every add / delete

### T-5: Pie Chart (Chart.js)
- [x] Groups amounts by category
- [x] Renders as pie chart via Chart.js CDN
- [x] Destroys and re-renders on every data change

### T-6: Responsive & Accessible UI
- [x] Mobile-first layout with CSS Grid / Flexbox
- [x] Keyboard-accessible form controls
- [x] Colour contrast meets WCAG AA
