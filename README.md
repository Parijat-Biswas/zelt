# 📊 LedgerFlow

A premium, highly interactive, and structurally polished personal debt tracking platform. Designed as a dependency-free Single-Page Application (SPA), **LedgerFlow** transitions traditional chaotic expense lists into a standard **Vertical Spreadsheet Grid Layout** optimized for desktop and mobile performance, featuring native support for **Indian Rupees (INR, ₹)**.

---

## 🌟 Key Features

### 1. Vertical Spreadsheet Grid Workspace
- **Google Sheets / Excel Familiarity**: Transactions are arranged in vertical rows with specialized, explicit column allocations to avoid horizontal layout shift:
  - **Borrower**: Formatted as prominent user identifiers (170px width).
  - **Flow**: Muted pill tags for `LENT` or `BORROWED` (120px width).
  - **Amount**: Color-coded values with precise currency tags (`+ ₹` in bold emerald for Lent, `- ₹` in bold rose for Borrowed) (130px width).
  - **Date**: Formatted calendar pickers (120px width).
  - **Status**: Visual status states: `Paid` (emerald badge), `Pending` (amber badge), `Partial` (sky badge), and `Overdue` (rose badge) (120px width).
  - **Tags**: Lightweight `#tag` badges (160px width).
  - **Description**: Truncated cell items expanding into a sidebar drawer on request (300px width).
  - **Actions**: Trigger side detail bars or delete rows instantly (100px width).

### 2. Fluid Inline-Cell Editing
- **Tacit Desktop Interaction**: Double-click *any cell* on the spreadsheet to instantly swap text with custom inputs, calendar elements, or dropdown select components.
- **Auto-Commit State**: Focus capture binds automatically. Press `Enter` or trigger a `Blur` event to commit edits instantly. Press `Escape` to discard modifications.

### 3. Native Indian Rupee (INR, ₹) Integration
- **Local Formatting**: All metric cards (Lent, Borrowed, Net Position, and Settlement Progress bars) use `en-IN` localizations.
- **Cohesive Interface**: Zero generic symbols. Everything from quick entry forms to inline amounts features native `₹` representation.

### 4. Visual Excellence & Dark HSL Aesthetics
- **Premium Styling**: Built around a custom glassmorphism dark-theme layout using tailored HSL color tokens, ambient neon backdrops, and entire-row hover highlight overlays.
- **Emoji-Free Layout**: Replaced casual emoji lists with structured, professional badges and clean iconography to maximize structural screen estate.
- **Satisfying "Paid" Celebrations**: Experience an ambient canvas-based particle confetti spray shooting across the viewport whenever a transaction state is changed to **Paid**.

### 5. Advanced Analytics & Utility Integrations
- **Dynamic Bezier SVGs**: Render cash flow trajectories modeling Lent vs. Borrowed histories over the past 6 months, complete with interactive hover tooltips.
- **Activity Log & Reminders**: Dedicated widgets monitoring overdue bills, collections, and a detailed audit stream tracking row edits.
- **Spreadsheet Backups**: Export or import database states instantly as standard CSV sheets compatible with Excel and Google Sheets.

---

## 📂 File Architecture

LedgerFlow is highly optimized and structured as a fast, single-directory build:
```bash
ledgerflow/
├── index.html       # Application layout, drawers, modals, & dashboard widgets
├── index.css        # Custom lighting, CSS variables, sheet layout overrides, & animations
├── app.js           # Core spreadsheet engine, cell editors, SVG plotter, & confetti logic
├── dummyData.js     # Default starter seed datasets denominated in INR
└── README.md        # Technical project overview & documentation
```

---

## 🚀 Getting Started

Because LedgerFlow is crafted using pure HTML, Vanilla CSS, and JavaScript, **no npm installs, compilation steps, or build runs are required**.

### Quick Run
1. Clone or download this repository.
2. Open the directory on your system.
3. Double-click `index.html` to load the application instantly in your default web browser.

### Local Server (Optional)
If you prefer testing local asset routing or offline behaviors through a server layer, open PowerShell or Terminal in the directory and run:
```bash
# Using Node's static-server
npx http-server ./

# Using Python
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

---

## 💾 Local Storage & Merges
All spreadsheet mutations auto-save to the browser's `localStorage` instantly. You can clear, backup, and restore your workspace safely using the backup actions inside the sidebar panels.

---

## 🎨 Premium CSS Tokens
The user interface is driven by a carefully compiled dark HSL color palette:
```css
:root {
  --bg-primary: #0a0b10;
  --bg-surface: rgba(20, 22, 32, 0.65);
  --border-color: rgba(255, 255, 255, 0.08);
  --accent-emerald: hsl(152, 60%, 50%);
  --accent-rose: hsl(346, 75%, 55%);
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
}
```
Feel free to customize these tokens inside `index.css` to tweak visual themes instantly!
