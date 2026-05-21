/**
 * LedgerFlow — Premium Columnar Spreadsheet Workspace Orchestration Engine
 * Implements state management, dynamic vertical columns (Group by Borrower),
 * double-decker inline cell editors, canvas confetti, and CSV backup.
 */

// ==========================================================================
// 1. Core State & Storage Management
// ==========================================================================
class LedgerState {
  constructor() {
    this.transactions = [];
    this.people = []; // Track unique borrowers representing columns
    this.activities = [];
    this.customReminders = [];
    this.activeTab = "dashboard";
    this.filters = {
      type: "all",
      search: "",
      sort: "date-desc"
    };
    this.selectedTransactionId = null;
    this.theme = "dark";
  }

  load() {
    // Load Theme
    const storedTheme = localStorage.getItem("lf_theme");
    if (storedTheme) {
      this.theme = storedTheme;
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      this.theme = prefersLight ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", this.theme);

    // Clean slate one-time reset check to wipe existing local storage dummy data
    const wasReset = localStorage.getItem("lf_clean_slate_reset_v1");
    if (!wasReset) {
      localStorage.removeItem("lf_transactions");
      localStorage.removeItem("lf_people");
      localStorage.removeItem("lf_activities");
      localStorage.removeItem("lf_custom_reminders");
      localStorage.setItem("lf_clean_slate_reset_v1", "true");
    }

    // Load Transactions
    const storedTx = localStorage.getItem("lf_transactions");
    if (storedTx) {
      try {
        this.transactions = JSON.parse(storedTx);
      } catch (e) {
        console.error("Failed to parse stored transactions", e);
        this.transactions = [];
      }
    } else {
      this.transactions = [];
      this.save(true);
    }

    // Load People representing columns
    const storedPeople = localStorage.getItem("lf_people");
    if (storedPeople) {
      try {
        this.people = JSON.parse(storedPeople);
      } catch (e) {
        this.people = this.extractPeopleFromTransactions();
      }
    } else {
      this.people = this.extractPeopleFromTransactions();
      this.save(true);
    }

    // Load Activities
    const storedActivities = localStorage.getItem("lf_activities");
    if (storedActivities) {
      try {
        this.activities = JSON.parse(storedActivities);
      } catch (e) {
        this.activities = [
          { id: "act-init", text: "Ledger initialized with starter workspace.", time: new Date().toISOString(), icon: "🚀" }
        ];
      }
    } else {
      this.activities = [
        { id: "act-init", text: "Ledger initialized with starter workspace.", time: new Date().toISOString(), icon: "🚀" }
      ];
      localStorage.setItem("lf_activities", JSON.stringify(this.activities));
    }

    // Load Custom Reminders
    const storedReminders = localStorage.getItem("lf_custom_reminders");
    if (storedReminders) {
      try {
        this.customReminders = JSON.parse(storedReminders);
      } catch (e) {
        this.customReminders = [];
      }
    } else {
      this.customReminders = [];
    }
  }

  extractPeopleFromTransactions() {
    // Return unique names chronologically or alphabetically
    const unique = new Set(this.transactions.map(t => t.name));
    return Array.from(unique);
  }

  save(silent = false) {
    if (!silent) {
      window.dispatchEvent(new CustomEvent("lf_autosave_start"));
    }
    localStorage.setItem("lf_transactions", JSON.stringify(this.transactions));
    localStorage.setItem("lf_people", JSON.stringify(this.people));
    localStorage.setItem("lf_activities", JSON.stringify(this.activities));
    localStorage.setItem("lf_custom_reminders", JSON.stringify(this.customReminders));
    
    if (!silent) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("lf_autosave_end"));
      }, 400);
    }
  }

  logActivity(text, icon = "📝") {
    const newActivity = {
      id: "act-" + Date.now(),
      text,
      time: new Date().toISOString(),
      icon
    };
    this.activities.unshift(newActivity);
    if (this.activities.length > 25) {
      this.activities.pop();
    }
    this.save(true);
    window.dispatchEvent(new CustomEvent("lf_activity_logged"));
  }
}

// ==========================================================================
// 12. Onboarding Walkthrough Manager
// ==========================================================================
class WalkthroughManager {
  constructor() {
    this.overlay = document.getElementById("walkthrough-overlay");
    this.steps = document.querySelectorAll(".walkthrough-step");
    this.dots = document.querySelectorAll(".step-dot");
    this.btnNext = document.getElementById("btn-walkthrough-next");
    this.btnSkip = document.getElementById("btn-walkthrough-skip");
    this.currentStep = 1;
    this.totalSteps = this.steps.length;

    if (this.btnNext) {
      this.btnNext.addEventListener("click", () => this.nextStep());
    }
    if (this.btnSkip) {
      this.btnSkip.addEventListener("click", () => this.complete());
    }
  }

  init() {
    const isFirstTime = !localStorage.getItem("lf_walkthrough_completed");
    if (isFirstTime) {
      setTimeout(() => this.show(), 1000);
    }
  }

  show() {
    this.overlay.classList.add("active");
    this.overlay.setAttribute("aria-hidden", "false");
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateUI();
      if (this.currentStep === this.totalSteps) {
        this.btnNext.textContent = "Get Started";
      }
    } else {
      this.complete();
    }
  }

  updateUI() {
    this.steps.forEach(s => s.classList.remove("active"));
    this.dots.forEach(d => d.classList.remove("active"));

    const activeStep = document.querySelector(`.walkthrough-step[data-step="${this.currentStep}"]`);
    if (activeStep) activeStep.classList.add("active");

    if (this.dots[this.currentStep - 1]) {
      this.dots[this.currentStep - 1].classList.add("active");
    }
  }

  complete() {
    this.overlay.classList.remove("active");
    this.overlay.setAttribute("aria-hidden", "true");
    localStorage.setItem("lf_walkthrough_completed", "true");
  }
}

const walkthrough = new WalkthroughManager();

// Instantiate global state
const state = new LedgerState();

// ==========================================================================
// 2. DOM Elements & Initialization Setup
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  state.load();
  initDOMElements();
  bindEventHandlers();
  initThemeToggle();
  
  // Initial renders
  renderApp();

  // Initialize walkthrough
  walkthrough.init();

  // Custom Events
  window.addEventListener("lf_autosave_start", () => {
    const badge = document.getElementById("autosave-status");
    if (badge) {
      badge.classList.add("saving");
      badge.querySelector(".badge-text").textContent = "Saving...";
    }
  });

  window.addEventListener("lf_autosave_end", () => {
    const badge = document.getElementById("autosave-status");
    if (badge) {
      badge.classList.remove("saving");
      badge.querySelector(".badge-text").textContent = "Saved";
    }
  });

  window.addEventListener("lf_activity_logged", () => {
    renderRecentActivities();
  });
});

let el = {};

function initDOMElements() {
  el = {
    navDashboard: document.getElementById("nav-dashboard"),
    navLedger: document.getElementById("nav-ledger"),
    navReminders: document.getElementById("nav-reminders"),
    remindersCount: document.getElementById("reminders-count"),
    
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    themeToggle: document.getElementById("theme-toggle"),
    
    btnExportCsv: document.getElementById("btn-export-csv"),
    btnImportCsv: document.getElementById("btn-import-csv"),
    btnQuickAdd: document.getElementById("btn-quick-add"),
    csvFileInput: document.getElementById("csv-file-input"),
    
    secDashboard: document.getElementById("section-dashboard"),
    secLedger: document.getElementById("section-ledger"),
    secReminders: document.getElementById("section-reminders"),
    
    valTotalLent: document.getElementById("val-total-lent"),
    valTotalBorrowed: document.getElementById("val-total-borrowed"),
    valNetBalance: document.getElementById("val-net-balance"),
    valNetDesc: document.getElementById("val-net-desc"),
    valSettlePct: document.getElementById("val-settle-pct"),
    valSettleProgress: document.getElementById("val-settle-progress"),
    valSettleDesc: document.getElementById("val-settle-desc"),
    activityLogContainer: document.getElementById("activity-log-container"),
    
    lentPendingPeopleList: document.getElementById("lent-pending-people-list"),
    borrowedPendingPeopleList: document.getElementById("borrowed-pending-people-list"),
    customReminderForm: document.getElementById("custom-reminder-form"),
    reminderInputText: document.getElementById("reminder-input-text"),
    reminderInputDate: document.getElementById("reminder-input-date"),
    reminderSelectPriority: document.getElementById("reminder-select-priority"),
    
    searchInput: document.getElementById("search-input"),
    btnClearSearch: document.getElementById("btn-clear-search"),
    filterPills: document.querySelectorAll(".filter-pill"),
    sortSelect: document.getElementById("sort-select"),
    
    ledgerTable: document.getElementById("ledger-table"),
    ledgerTableHead: document.getElementById("ledger-table-head"),
    ledgerTableBody: document.getElementById("ledger-table-body"),
    btnAddTableRow: document.getElementById("btn-add-table-row"),
    visibleRowsCount: document.getElementById("visible-rows-count"),
    totalRowsCount: document.getElementById("total-rows-count"),
    
    remindersOverdueCount: document.getElementById("reminders-overdue-count"),
    remindersPendingCount: document.getElementById("reminders-pending-count"),
    remindersListContainer: document.getElementById("reminders-list-container"),
    
    quickAddModal: document.getElementById("quick-add-modal"),
    quickAddForm: document.getElementById("quick-add-form"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancelModal: document.getElementById("btn-cancel-modal"),
    
    drawerOverlay: document.getElementById("detail-drawer-overlay"),
    btnCloseDrawer: document.getElementById("btn-close-drawer"),
    btnDrawerSaveClose: document.getElementById("btn-drawer-save-close"),
    btnDrawerDeleteRow: document.getElementById("btn-drawer-delete-row"),
    drawerNameTitle: document.getElementById("drawer-name-title"),
    drawerTypeSubtitle: document.getElementById("drawer-type-subtitle"),
    
    drName: document.getElementById("drawer-input-name"),
    drType: document.getElementById("drawer-select-type"),
    drAmount: document.getElementById("drawer-input-amount"),
    drDate: document.getElementById("drawer-input-date"),
    drStatus: document.getElementById("drawer-select-status"),
    drPriority: document.getElementById("drawer-select-priority"),
    drColor: document.getElementById("drawer-select-color"),
    drTagsList: document.getElementById("drawer-tags-list"),
    drTagNewInput: document.getElementById("drawer-tag-new-input"),
    btnDrAddTag: document.getElementById("btn-drawer-add-tag"),
    drDescription: document.getElementById("drawer-input-description"),
    drAuditLog: document.getElementById("drawer-audit-log"),
    
    trendSvg: document.getElementById("trend-svg"),
    chartTooltip: document.getElementById("chart-tooltip"),
    confettiCanvas: document.getElementById("confetti-canvas")
  };
}

function initThemeToggle() {
  el.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    localStorage.setItem("lf_theme", state.theme);
    renderTrendChart();
  });
}

function switchTab(targetTab) {
  state.activeTab = targetTab;
  
  el.navDashboard.classList.toggle("active", targetTab === "dashboard");
  el.navLedger.classList.toggle("active", targetTab === "ledger");
  el.navReminders.classList.toggle("active", targetTab === "reminders");
  
  el.secDashboard.classList.toggle("active", targetTab === "dashboard");
  el.secLedger.classList.toggle("active", targetTab === "ledger");
  el.secReminders.classList.toggle("active", targetTab === "reminders");
  
  if (targetTab === "dashboard") {
    el.pageTitle.textContent = "Dashboard Hub";
    el.pageSubtitle.textContent = "Welcome back. Here is your financial posture at a glance.";
  } else if (targetTab === "ledger") {
    el.pageTitle.textContent = "Logs";
    el.pageSubtitle.textContent = "Manage credit, lent, and borrowed personal records in a clean, vertical grid.";
  } else if (targetTab === "reminders") {
    el.pageTitle.textContent = "Reminders & Alerts";
    el.pageSubtitle.textContent = "Calculated schedules based on payment terms and due dates.";
  }
  
  renderApp();
}

function bindEventHandlers() {
  el.navDashboard.addEventListener("click", () => switchTab("dashboard"));
  el.navLedger.addEventListener("click", () => switchTab("ledger"));
  el.navReminders.addEventListener("click", () => switchTab("reminders"));
  
  const openModal = () => {
    el.quickAddModal.classList.add("active");
    el.quickAddModal.setAttribute("aria-hidden", "false");
    document.getElementById("form-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("form-name").focus();
  };
  
  const closeModal = () => {
    el.quickAddModal.classList.remove("active");
    el.quickAddModal.setAttribute("aria-hidden", "true");
    el.quickAddForm.reset();
  };
  
  el.btnQuickAdd.addEventListener("click", openModal);
  el.btnCloseModal.addEventListener("click", closeModal);
  el.btnCancelModal.addEventListener("click", closeModal);
  
  el.quickAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createRecordFromForm();
    closeModal();
  });

  if (el.customReminderForm) {
    el.customReminderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addCustomReminder();
    });
  }

  // Table add row click binding
  el.btnAddTableRow.style.display = "inline-flex";
  el.btnAddTableRow.addEventListener("click", () => {
    openModal();
  });
  
  el.searchInput.addEventListener("input", (e) => {
    state.filters.search = e.target.value.trim().toLowerCase();
    el.btnClearSearch.style.display = state.filters.search ? "block" : "none";
    renderTable();
  });
  
  el.btnClearSearch.addEventListener("click", () => {
    el.searchInput.value = "";
    state.filters.search = "";
    el.btnClearSearch.style.display = "none";
    renderTable();
  });
  
  el.filterPills.forEach(pill => {
    pill.addEventListener("click", (e) => {
      el.filterPills.forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-checked", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-checked", "true");
      state.filters.type = pill.getAttribute("data-filter");
      renderTable();
    });
  });
  
  el.sortSelect.addEventListener("change", (e) => {
    state.filters.sort = e.target.value;
    renderTable();
  });
  
  const closeDrawer = () => {
    el.drawerOverlay.classList.remove("active");
    el.drawerOverlay.setAttribute("aria-hidden", "true");
    state.selectedTransactionId = null;
    renderTable();
  };
  
  el.btnCloseDrawer.addEventListener("click", closeDrawer);
  el.btnDrawerSaveClose.addEventListener("click", () => {
    saveDrawerChanges();
    closeDrawer();
  });
  el.btnDrawerDeleteRow.addEventListener("click", () => {
    if (confirm("Are you absolutely sure you want to delete this ledger entry permanently?")) {
      deleteSelectedRecord();
      closeDrawer();
    }
  });
  
  el.btnDrAddTag.addEventListener("click", addTagFromDrawer);
  el.drTagNewInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTagFromDrawer();
  });

  el.btnExportCsv.addEventListener("click", exportToCSV);
  el.btnImportCsv.addEventListener("click", () => el.csvFileInput.click());
  el.csvFileInput.addEventListener("change", importFromCSV);
}

// ==========================================================================
// 3. Central Application Orchestration Render
// ==========================================================================
function renderApp() {
  updateMetricsData();
  renderTrendChart();
  renderRecentActivities();
  renderTable();
  renderReminders();
}

function updateMetricsData() {
  let lentSum = 0;
  let borrowedSum = 0;
  let paidCount = 0;
  let activeCount = 0;
  
  state.transactions.forEach(t => {
    const val = Number(t.amount) || 0;
    
    if (t.type === "lent") {
      if (t.status !== "paid") {
        lentSum += val;
      }
    } else if (t.type === "borrowed") {
      if (t.status !== "paid") {
        borrowedSum += val;
      }
    }

    if (t.status === "paid") {
      paidCount++;
    }
    activeCount++;
  });
  
  if (el.valTotalLent) el.valTotalLent.textContent = formatCurrency(lentSum);
  if (el.valTotalBorrowed) el.valTotalBorrowed.textContent = formatCurrency(borrowedSum);
  
  if (el.valNetBalance) {
    const net = lentSum - borrowedSum;
    el.valNetBalance.textContent = formatCurrency(net);
    
    if (net > 0) {
      el.valNetBalance.className = "metric-value text-emerald";
      if (el.valNetDesc) {
        el.valNetDesc.textContent = "Positive Asset Position";
        el.valNetDesc.className = "metric-meta text-emerald";
      }
    } else if (net < 0) {
      el.valNetBalance.className = "metric-value text-rose";
      if (el.valNetDesc) {
        el.valNetDesc.textContent = "Net Liability Position";
        el.valNetDesc.className = "metric-meta text-rose";
      }
    } else {
      el.valNetBalance.className = "metric-value";
      if (el.valNetDesc) {
        el.valNetDesc.textContent = "Fully Settled Stance";
        el.valNetDesc.className = "metric-meta";
      }
    }
  }
  
  if (el.valSettlePct) {
    const pct = activeCount > 0 ? Math.round((paidCount / activeCount) * 100) : 0;
    el.valSettlePct.textContent = `${pct}%`;
    if (el.valSettleProgress) el.valSettleProgress.style.width = `${pct}%`;
    if (el.valSettleDesc) el.valSettleDesc.textContent = `${paidCount} of ${activeCount} records paid`;
  }

  // Render Grouped Outstanding Balances Directory
  renderPendingSettlementsDirectory();
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
}

// ==========================================================================
// 4. COLUMNAR SPREADSHEET TABLE GRID ENGINE (The Key Layout Redesign)
// ==========================================================================
function renderTable() {
  const thead = el.ledgerTableHead;
  const tbody = el.ledgerTableBody;
  
  thead.innerHTML = "";
  tbody.innerHTML = "";
  
  // 1. Render static spreadsheet headers
  const trHead = document.createElement("tr");
  const headers = ["Borrower", "Flow", "Amount", "Date", "Status", "Tags", "Description", "Actions"];
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  
  // 2. Gather, filter and sort transactions
  let filteredTx = state.transactions.filter(t => {
    // Search Filter
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(searchLower);
      const matchDesc = (t.description || "").toLowerCase().includes(searchLower);
      const matchTags = t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower));
      const matchAmount = String(t.amount).includes(searchLower);
      if (!matchName && !matchDesc && !matchTags && !matchAmount) return false;
    }
    
    // Status/Type Pills
    if (state.filters.type === "lent" && t.type !== "lent") return false;
    if (state.filters.type === "borrowed" && t.type !== "borrowed") return false;
    if (state.filters.type === "pending" && t.status !== "pending") return false;
    if (state.filters.type === "overdue" && t.status !== "overdue") return false;
    if (state.filters.type === "paid" && t.status !== "paid") return false;
    
    return true;
  });
  
  // Sort
  filteredTx.sort((a, b) => {
    const s = state.filters.sort;
    if (s === "date-desc") return new Date(b.date) - new Date(a.date);
    if (s === "date-asc") return new Date(a.date) - new Date(b.date);
    if (s === "amount-desc") return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    if (s === "amount-asc") return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    if (s === "name-asc") return a.name.localeCompare(b.name);
    return 0;
  });
  
  el.visibleRowsCount.textContent = filteredTx.length;
  el.totalRowsCount.textContent = state.transactions.length;
  
  if (filteredTx.length === 0) {
    const trEmpty = document.createElement("tr");
    trEmpty.innerHTML = `<td colspan="8" class="text-center" style="color: var(--text-tertiary); padding: 40px; font-size: 0.85rem;">No matching ledger rows found. Click the bottom "+ Add Row" or use "Quick Entry" to start.</td>`;
    tbody.appendChild(trEmpty);
    return;
  }
  
  // 3. Render flat table rows
  filteredTx.forEach(tx => {
    const tr = document.createElement("tr");
    tr.className = "spreadsheet-row " + (tx.color !== "none" ? tx.color : "");
    tr.dataset.id = tx.id;
    
    // Cell 1: Borrower (Double-clickable to edit)
    const tdName = document.createElement("td");
    tdName.className = "cell-name";
    const nameVal = tx.name.trim() || "-";
    const nameStyle = tx.name.trim() ? "" : "color: var(--text-tertiary); font-weight: normal;";
    tdName.innerHTML = `<span class="cell-text-bold" style="${nameStyle}">${nameVal}</span>`;
    makeCellEditable(tdName, tx, "name", 
      t => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cell-input-edit";
        input.value = t.name;
        input.placeholder = "Enter name...";
        return input;
      },
      input => input.value.trim()
    );
    tr.appendChild(tdName);
    
    // Cell 2: Flow Type (Double-clickable to toggle)
    const tdFlow = document.createElement("td");
    tdFlow.className = "cell-flow";
    
    let flowText = "-";
    let flowCls = "text-muted";
    if (tx.type === "lent") {
      flowText = "Lent (↗)";
      flowCls = "text-emerald";
    } else if (tx.type === "borrowed") {
      flowText = "Borrowed (↘)";
      flowCls = "text-rose";
    }
    
    tdFlow.innerHTML = `<span class="${flowCls}" style="font-weight: 600; font-size: 0.8rem;">${flowText}</span>`;
    makeCellEditable(tdFlow, tx, "type",
      t => {
        const select = document.createElement("select");
        select.className = "cell-select-edit form-select";
        
        const optPlaceholder = document.createElement("option");
        optPlaceholder.value = "";
        optPlaceholder.textContent = "-- Select Flow --";
        if (!t.type) optPlaceholder.selected = true;
        select.appendChild(optPlaceholder);

        const optLent = document.createElement("option");
        optLent.value = "lent";
        optLent.textContent = "LENT (They owe me)";
        if (t.type === "lent") optLent.selected = true;
        
        const optBorrow = document.createElement("option");
        optBorrow.value = "borrowed";
        optBorrow.textContent = "BORROWED (I owe them)";
        if (t.type === "borrowed") optBorrow.selected = true;
        
        select.appendChild(optLent);
        select.appendChild(optBorrow);
        return select;
      },
      select => select.value
    );
    tr.appendChild(tdFlow);
    
    // Cell 3: Amount (Double-clickable to edit)
    const tdAmount = document.createElement("td");
    tdAmount.className = "cell-amount";
    
    const isLent = tx.type === "lent";
    const isBorrowed = tx.type === "borrowed";
    const amtCls = isLent ? "text-emerald" : (isBorrowed ? "text-rose" : "text-muted");
    const prefix = isLent ? "+ " : (isBorrowed ? "- " : "");
    const hasAmount = tx.amount !== undefined && tx.amount !== null && tx.amount !== "";
    const amountVal = hasAmount ? formatCurrency(tx.amount) : "-";
    
    tdAmount.innerHTML = `<span class="cell-amount-text ${amtCls}">${prefix}${amountVal}</span>`;
    makeCellEditable(tdAmount, tx, "amount",
      t => {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.className = "cell-input-edit";
        input.placeholder = "0.00";
        input.value = (t.amount !== undefined && t.amount !== null && t.amount !== "") ? t.amount : "";
        return input;
      },
      input => {
        const val = input.value.trim();
        return val === "" ? "" : Math.max(0, Number(val) || 0);
      }
    );
    tr.appendChild(tdAmount);
    
    // Cell 4: Date (Double-clickable to edit)
    const tdDate = document.createElement("td");
    tdDate.className = "cell-date";
    tdDate.innerHTML = `<span class="cell-date-text">${tx.date}</span>`;
    makeCellEditable(tdDate, tx, "date",
      t => {
        const input = document.createElement("input");
        input.type = "date";
        input.className = "cell-input-edit";
        input.value = t.date;
        return input;
      },
      input => input.value || new Date().toISOString().split('T')[0]
    );
    tr.appendChild(tdDate);
    
    // Cell 5: Status (Double-clickable to edit)
    const tdStatus = document.createElement("td");
    tdStatus.className = "cell-status";
    tdStatus.innerHTML = `<span class="cell-status-pill ${tx.status}">${tx.status}</span>`;
    makeCellEditable(tdStatus, tx, "status",
      t => {
        const select = document.createElement("select");
        select.className = "cell-select-edit form-select " + t.status;
        ["pending", "partial", "overdue", "paid"].forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s.toUpperCase();
          if (s === t.status) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener("change", (e) => {
          select.className = "cell-select-edit form-select " + e.target.value;
        });
        return select;
      },
      select => select.value
    );
    tr.appendChild(tdStatus);
    
    // Cell 6: Tags (Double-clickable to edit)
    const tdTags = document.createElement("td");
    tdTags.className = "cell-tags";
    tdTags.innerHTML = `<span class="cell-tags-text">${tx.tags.map(t => `#${t}`).join(' ')}</span>`;
    makeCellEditable(tdTags, tx, "tags",
      t => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cell-input-edit";
        input.value = t.tags.join(", ");
        return input;
      },
      input => input.value.split(",").map(t => t.trim()).filter(t => t.length > 0)
    );
    tr.appendChild(tdTags);
    
    // Cell 7: Description (Double-clickable to edit)
    const tdDesc = document.createElement("td");
    tdDesc.className = "cell-desc";
    tdDesc.innerHTML = `<span class="cell-desc-text">${tx.description || '— No notes —'}</span>`;
    makeCellEditable(tdDesc, tx, "description",
      t => {
        const textarea = document.createElement("textarea");
        textarea.className = "cell-textarea-edit form-input";
        textarea.value = t.description || "";
        textarea.placeholder = "Notes...";
        return textarea;
      },
      textarea => textarea.value.trim()
    );
    tr.appendChild(tdDesc);
    
    // Cell 8: Actions (Quick details & delete buttons)
    const tdActions = document.createElement("td");
    tdActions.className = "cell-actions";
    tdActions.innerHTML = `
      <div class="row-actions-group">
        <button class="row-action-btn view-btn" aria-label="Open drawer details">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="row-action-btn delete-btn" aria-label="Delete entry">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;
    
    // Clicks row actions
    tdActions.querySelector(".view-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openDetailDrawer(tx.id);
    });
    
    tdActions.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete this ledger entry for ${tx.name}?`)) {
        state.selectedTransactionId = tx.id;
        deleteSelectedRecord();
      }
    });
    
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function makeCellEditable(tdElement, transaction, field, inputCreator, valueExtractor) {
  tdElement.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    if (tdElement.classList.contains("cell-double-decker-editing")) return;
    
    tdElement.classList.add("cell-double-decker-editing");
    const originalHTML = tdElement.innerHTML;
    
    const input = inputCreator(transaction);
    tdElement.innerHTML = "";
    tdElement.appendChild(input);
    input.focus();
    
    // Select input content on focus for standard spreadsheet behavior
    if (input.select && input.tagName !== "SELECT") {
      input.select();
    }
    
    let committed = false;
    const commitInlineEdit = (save) => {
      if (committed) return;
      committed = true;
      tdElement.classList.remove("cell-double-decker-editing");
      
      if (save) {
        let newVal = valueExtractor(input);
        const oldVal = transaction[field];
        
        // Handle array comparison for tags
        let isChanged = false;
        if (Array.isArray(newVal) && Array.isArray(oldVal)) {
          isChanged = JSON.stringify(newVal) !== JSON.stringify(oldVal);
        } else {
          isChanged = newVal !== oldVal;
        }
        
        if (isChanged) {
          transaction[field] = newVal;
          
          if (!transaction.audit) transaction.audit = [];
          transaction.audit.unshift({
            time: new Date().toISOString(),
            text: `Inline sheet edit: Field "${field}" changed from "${oldVal}" to "${newVal}"`
          });
          
          if (field === "status" && newVal === "paid" && oldVal !== "paid") {
            triggerConfetti();
          }
          
          state.logActivity(`Edited sheet cell for borrower "${transaction.name}".`, "✏️");
          state.save();
          renderApp();
        } else {
          tdElement.innerHTML = originalHTML;
        }
      } else {
        tdElement.innerHTML = originalHTML;
      }
    };
    
    // Save on blur
    input.addEventListener("blur", () => {
      // Small timeout to allow click actions inside dropdowns to finish first
      setTimeout(() => commitInlineEdit(true), 150);
    });
    
    // Handle Enter and Escape keypresses
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        commitInlineEdit(true);
      }
      if (e.key === "Escape") {
        commitInlineEdit(false);
      }
    });
  });
}

// ==========================================================================
// 6. View 1: Analytical Center SVG Trend Line Curve Plotter
// ==========================================================================
function renderTrendChart() {
  if (!el.trendSvg) return;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: months[d.getMonth()]
    });
  }
  
  const lentData = Array(6).fill(0);
  const borrowedData = Array(6).fill(0);
  
  state.transactions.forEach(t => {
    const tDate = new Date(t.date);
    if (isNaN(tDate)) return;
    
    const val = Number(t.amount) || 0;
    
    last6Months.forEach((m, idx) => {
      if (tDate.getFullYear() === m.year && tDate.getMonth() === m.month) {
        if (t.type === "lent") {
          lentData[idx] += val;
        } else {
          borrowedData[idx] += val;
        }
      }
    });
  });
  
  const width = 500;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;
  
  const maxVal = Math.max(...lentData, ...borrowedData, 100) * 1.1;
  
  const getCoords = (data) => {
    return data.map((val, idx) => {
      const x = paddingX + (idx / 5) * (width - 2 * paddingX);
      const y = height - paddingY - (val / maxVal) * (height - 2 * paddingY);
      return { x, y };
    });
  };
  
  const lentCoords = getCoords(lentData);
  const borrowedCoords = getCoords(borrowedData);
  
  const buildSmoothPath = (coords) => {
    if (coords.length === 0) return "";
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const xc = (coords[i].x + coords[i + 1].x) / 2;
      const yc = (coords[i].y + coords[i + 1].y) / 2;
      d += ` Q ${coords[i].x} ${coords[i].y}, ${xc} ${yc}`;
    }
    d += ` L ${coords[coords.length - 1].x} ${coords[coords.length - 1].y}`;
    return d;
  };
  
  const pathLent = buildSmoothPath(lentCoords);
  const pathBorrowed = buildSmoothPath(borrowedCoords);
  
  const lineLent = document.getElementById("chart-line-lent");
  const lineBorrowed = document.getElementById("chart-line-borrowed");
  if (lineLent) lineLent.setAttribute("d", pathLent);
  if (lineBorrowed) lineBorrowed.setAttribute("d", pathBorrowed);
  
  const areaLent = document.getElementById("chart-area-lent");
  const areaBorrowed = document.getElementById("chart-area-borrowed");
  
  if (areaLent && lentCoords.length > 0) {
    const areaD = pathLent + ` L ${lentCoords[lentCoords.length - 1].x} ${height - paddingY} L ${lentCoords[0].x} ${height - paddingY} Z`;
    areaLent.setAttribute("d", areaD);
  }
  if (areaBorrowed && borrowedCoords.length > 0) {
    const areaD = pathBorrowed + ` L ${borrowedCoords[borrowedCoords.length - 1].x} ${height - paddingY} L ${borrowedCoords[0].x} ${height - paddingY} Z`;
    areaBorrowed.setAttribute("d", areaD);
  }
  
  el.trendSvg.querySelectorAll(".chart-interactive-point").forEach(c => c.remove());
  
  const renderInteractivePoints = (coords, data, type) => {
    coords.forEach((c, idx) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", c.x);
      circle.setAttribute("cy", c.y);
      circle.setAttribute("r", "5");
      circle.setAttribute("class", `chart-interactive-point color-${type}`);
      circle.style.cursor = "pointer";
      circle.style.fill = `var(--status-${type})`;
      circle.style.stroke = "white";
      circle.style.strokeWidth = "2";
      circle.style.transition = "transform var(--transition-fast)";
      
      circle.addEventListener("mouseenter", (e) => {
        circle.setAttribute("r", "8");
        el.chartTooltip.style.opacity = 1;
        el.chartTooltip.innerHTML = `<strong>${last6Months[idx].label}</strong>: ${formatCurrency(data[idx])} (${type})`;
        
        const rect = el.trendSvg.getBoundingClientRect();
        const tooltipX = e.clientX - rect.left + 10;
        const tooltipY = e.clientY - rect.top - 40;
        el.chartTooltip.style.left = `${tooltipX}px`;
        el.chartTooltip.style.top = `${tooltipY}px`;
      });
      
      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("r", "5");
        el.chartTooltip.style.opacity = 0;
      });
      
      el.trendSvg.appendChild(circle);
    });
  };
  
  renderInteractivePoints(lentCoords, lentData, "lent");
  renderInteractivePoints(borrowedCoords, borrowedData, "borrowed");
  
  el.trendSvg.querySelectorAll(".chart-month-lbl").forEach(l => l.remove());
  last6Months.forEach((m, idx) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const x = paddingX + (idx / 5) * (width - 2 * paddingX);
    text.setAttribute("x", x);
    text.setAttribute("y", height - 2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "chart-month-lbl");
    text.style.fontSize = "9px";
    text.style.fill = "var(--text-tertiary)";
    text.style.fontWeight = "600";
    text.textContent = m.label;
    el.trendSvg.appendChild(text);
  });
}

function renderRecentActivities() {
  const container = el.activityLogContainer;
  container.innerHTML = "";
  
  if (state.activities.length === 0) {
    container.innerHTML = `<div class="empty-state">No activities recorded yet.</div>`;
    return;
  }
  
  state.activities.slice(0, 12).forEach(act => {
    const div = document.createElement("div");
    div.className = "activity-item";

    // Color-coding class based on icon
    const icon = act.icon || "📝";
    if (icon === "💰" || icon === "➕") div.classList.add("act-create");
    else if (icon === "✏️" || icon === "⚙️") div.classList.add("act-update");
    else if (icon === "🗑️") div.classList.add("act-delete");
    else if (icon === "⏰") div.classList.add("act-reminder");
    else div.classList.add("act-default");

    const timeStr = formatRelativeTime(new Date(act.time));
    div.innerHTML = `
      <span class="activity-icon">${icon}</span>
      <div class="activity-details">
        <span class="activity-text">${act.text}</span>
        <span class="activity-time">${timeStr}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  
  if (diffSec < 45) return "just now";
  if (diffMin < 45) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ==========================================================================
// 7. View 3: Reminders Notification Engine
// ==========================================================================
function renderReminders() {
  const container = el.remindersListContainer;
  if (!container) return;
  
  container.innerHTML = "";
  
  // Sidebar reminders count badge
  const totalRemindersCount = state.customReminders.length;
  if (el.remindersCount) {
    if (totalRemindersCount > 0) {
      el.remindersCount.textContent = totalRemindersCount;
      el.remindersCount.style.display = "inline-flex";
    } else {
      el.remindersCount.style.display = "none";
    }
  }

  if (el.remindersOverdueCount) {
    const overdueCount = state.transactions.filter(t => t.status === "overdue").length;
    el.remindersOverdueCount.textContent = overdueCount;
  }
  if (el.remindersPendingCount) {
    const pendingCount = state.transactions.filter(t => t.status === "pending" || t.status === "partial").length;
    el.remindersPendingCount.textContent = pendingCount;
  }

  if (state.customReminders.length === 0) {
    container.innerHTML = `<div class="empty-state">No custom reminders yet. Create one to get started!</div>`;
    return;
  }
  
  // Sort reminders: high priority first, then medium, then low, and then by date
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedReminders = [...state.customReminders].sort((a, b) => {
    const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (diff !== 0) return diff;
    return new Date(a.date) - new Date(b.date);
  });

  sortedReminders.forEach(r => {
    const card = document.createElement("div");
    card.className = `reminder-card priority-${r.priority}`;
    
    // Formatting date
    const d = new Date(r.date);
    const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Check if overdue
    const isOverdue = new Date(r.date) < new Date() && new Date().toDateString() !== d.toDateString();
    const statusText = isOverdue ? "Overdue" : "Pending";
    const statusClass = isOverdue ? "text-rose" : "text-emerald";

    card.innerHTML = `
      <div class="reminder-details">
        <div class="reminder-title">${r.description}</div>
        <div class="reminder-desc" style="margin-top: 4px; display: flex; gap: 8px; font-size: 0.7rem;">
          <span style="text-transform: uppercase; font-weight: 700; color: var(--text-tertiary)">Priority:</span>
          <span style="font-weight: 600; color: var(--accent-purple)">${r.priority}</span>
          <span style="color: var(--text-tertiary)">|</span>
          <span style="text-transform: uppercase; font-weight: 700; color: var(--text-tertiary)">Status:</span>
          <span class="${statusClass}" style="font-weight: 600">${statusText}</span>
        </div>
      </div>
      <div class="reminder-meta" style="display: flex; align-items: center; gap: 16px;">
        <span class="reminder-days" style="color: var(--text-secondary); font-size: 0.75rem;">${dateFormatted}</span>
        <button class="reminder-delete-btn" onclick="deleteCustomReminder('${r.id}')" aria-label="Delete reminder">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function addCustomReminder() {
  if (!el.reminderInputText || !el.reminderInputDate || !el.reminderSelectPriority) return;
  const desc = el.reminderInputText.value.trim();
  const date = el.reminderInputDate.value;
  const priority = el.reminderSelectPriority.value;
  
  if (!desc || !date) return;
  
  const reminder = {
    id: "rem-" + Date.now(),
    description: desc,
    date: date,
    priority: priority,
    completed: false
  };
  
  state.customReminders.push(reminder);
  state.logActivity(`Added custom reminder: "${desc}"`, "⏰");
  state.save();
  
  if (el.customReminderForm) {
    el.customReminderForm.reset();
  }
  
  renderApp();
}

function deleteCustomReminder(id) {
  const idx = state.customReminders.findIndex(r => r.id === id);
  if (idx !== -1) {
    const removed = state.customReminders.splice(idx, 1)[0];
    state.logActivity(`Removed custom reminder: "${removed.description}"`, "🗑️");
    state.save();
    renderApp();
  }
}

window.deleteCustomReminder = deleteCustomReminder;

function renderPendingSettlementsDirectory() {
  const lentList = el.lentPendingPeopleList;
  const borrowedList = el.borrowedPendingPeopleList;
  
  if (!lentList || !borrowedList) return;
  
  lentList.innerHTML = "";
  borrowedList.innerHTML = "";
  
  const balances = {};
  
  state.transactions.forEach(t => {
    if (t.status === "paid") return;
    
    const val = Number(t.amount) || 0;
    const name = t.name.trim();
    if (!name) return;
    
    if (!balances[name]) {
      balances[name] = 0;
    }
    
    if (t.type === "lent") {
      balances[name] += val;
    } else if (t.type === "borrowed") {
      balances[name] -= val;
    }
  });
  
  const oweYouList = [];
  const youOweList = [];
  
  Object.keys(balances).forEach(name => {
    const net = balances[name];
    if (net > 0) {
      oweYouList.push({ name, amount: net });
    } else if (net < 0) {
      youOweList.push({ name, amount: Math.abs(net) });
    }
  });
  
  oweYouList.sort((a, b) => b.amount - a.amount);
  youOweList.sort((a, b) => b.amount - a.amount);
  
  if (oweYouList.length === 0) {
    lentList.innerHTML = `<li style="color: var(--text-tertiary); font-size: 0.75rem; padding: 16px; text-align: center;">No pending collections</li>`;
  } else {
    oweYouList.forEach(item => {
      const li = document.createElement("li");
      li.className = "people-pending-item";
      li.innerHTML = `
        <span class="people-pending-name">${item.name}</span>
        <span class="people-pending-amount text-emerald">${formatCurrency(item.amount)}</span>
      `;
      lentList.appendChild(li);
    });
  }
  
  if (youOweList.length === 0) {
    borrowedList.innerHTML = `<li style="color: var(--text-tertiary); font-size: 0.75rem; padding: 16px; text-align: center;">No pending liabilities</li>`;
  } else {
    youOweList.forEach(item => {
      const li = document.createElement("li");
      li.className = "people-pending-item";
      li.innerHTML = `
        <span class="people-pending-name">${item.name}</span>
        <span class="people-pending-amount text-rose">${formatCurrency(item.amount)}</span>
      `;
      borrowedList.appendChild(li);
    });
  }
}

// ==========================================================================
// 8. Expandable Side Detail Drawer Manager
// ==========================================================================
function openDetailDrawer(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;
  
  state.selectedTransactionId = txId;
  
  el.drName.value = tx.name || "Untitled";
  el.drType.value = tx.type || "lent";
  el.drAmount.value = tx.amount || 0;
  el.drDate.value = tx.date || "";
  el.drStatus.value = tx.status || "pending";
  el.drPriority.value = tx.priority || "low";
  el.drColor.value = tx.color || "none";
  el.drDescription.value = tx.description || "";
  
  el.drawerNameTitle.textContent = tx.name || "Untitled";
  el.drawerTypeSubtitle.textContent = `${tx.type} Transaction Workspace`;
  
  renderDrawerTags(tx);
  renderDrawerAuditLogs(tx);
  
  el.drawerOverlay.classList.add("active");
  el.drawerOverlay.setAttribute("aria-hidden", "false");
}

function renderDrawerTags(tx) {
  const container = el.drTagsList;
  container.innerHTML = "";
  
  if (!tx.tags || tx.tags.length === 0) {
    container.innerHTML = `<span style="color: var(--text-tertiary); font-size: 0.75rem;">No category tags assigned.</span>`;
    return;
  }
  
  tx.tags.forEach((tag, idx) => {
    const pill = document.createElement("span");
    pill.className = "drawer-tag-pill";
    pill.innerHTML = `
      #${tag}
      <span class="drawer-tag-remove" onclick="removeTagFromSelected(${idx})">&times;</span>
    `;
    container.appendChild(pill);
  });
}

function removeTagFromSelected(index) {
  const tx = state.transactions.find(t => t.id === state.selectedTransactionId);
  if (!tx) return;
  
  const removed = tx.tags.splice(index, 1);
  state.logActivity(`Removed tag #${removed} from ${tx.name}.`, "🏷️");
  state.save();
  renderDrawerTags(tx);
  renderTable();
}

window.removeTagFromSelected = removeTagFromSelected;

function addTagFromDrawer() {
  const tx = state.transactions.find(t => t.id === state.selectedTransactionId);
  if (!tx) return;
  
  const tagVal = el.drTagNewInput.value.trim();
  if (tagVal) {
    if (!tx.tags) tx.tags = [];
    if (!tx.tags.includes(tagVal)) {
      tx.tags.push(tagVal);
      state.logActivity(`Added tag #${tagVal} to ${tx.name}.`, "🏷️");
      state.save();
      renderDrawerTags(tx);
      renderTable();
    }
    el.drTagNewInput.value = "";
  }
}

function renderDrawerAuditLogs(tx) {
  const container = el.drAuditLog;
  container.innerHTML = "";
  
  if (!tx.audit || tx.audit.length === 0) {
    tx.audit = [{ time: new Date().toISOString(), text: "Record initialized." }];
  }
  
  tx.audit.forEach(a => {
    const step = document.createElement("div");
    step.className = "timeline-step";
    
    const date = new Date(a.time).toLocaleString();
    step.innerHTML = `
      <div class="timeline-time">${date}</div>
      <div class="timeline-message">${a.text}</div>
    `;
    container.appendChild(step);
  });
}

function saveDrawerChanges() {
  const tx = state.transactions.find(t => t.id === state.selectedTransactionId);
  if (!tx) return;
  
  const changes = [];
  
  const checkUpdate = (prop, newVal, logText) => {
    if (tx[prop] !== newVal) {
      changes.push(logText);
      tx[prop] = newVal;
    }
  };
  
  // Track name change (handles renaming columnar headers)
  if (tx.name !== el.drName.value) {
    const oldName = tx.name;
    const newName = el.drName.value.trim();
    if (newName) {
      tx.name = newName;
      changes.push(`Renamed borrower column from "${oldName}" to "${newName}"`);
      
      // If the old name has no transactions left, update it in people columns list
      const oldIndex = state.people.indexOf(oldName);
      if (oldIndex !== -1 && !state.transactions.some(t => t.name.toLowerCase() === oldName.toLowerCase() && t.id !== tx.id)) {
        state.people[oldIndex] = newName;
      } else if (!state.people.includes(newName)) {
        state.people.push(newName);
      }
    }
  }

  checkUpdate("type", el.drType.value, `Flow changed to "${el.drType.value}"`);
  
  const numAmt = Number(el.drAmount.value) || 0;
  checkUpdate("amount", numAmt, `Amount updated to ${formatCurrency(numAmt)}`);
  checkUpdate("date", el.drDate.value, `Date adjusted to ${el.drDate.value}`);
  checkUpdate("priority", el.drPriority.value, `Priority changed to ${el.drPriority.value}`);
  checkUpdate("color", el.drColor.value, `Highlight row tint changed to ${el.drColor.value}`);
  checkUpdate("description", el.drDescription.value, `Notes updated`);
  
  if (tx.status !== el.drStatus.value) {
    changes.push(`Status changed from "${tx.status}" to "${el.drStatus.value}"`);
    tx.status = el.drStatus.value;
    if (tx.status === "paid") {
      triggerConfetti();
    }
  }
  
  if (changes.length > 0) {
    if (!tx.audit) tx.audit = [];
    changes.forEach(c => {
      tx.audit.unshift({ time: new Date().toISOString(), text: c });
    });
    
    state.logActivity(`Modified details drawer for "${tx.name}".`, "⚙️");
    state.save();
    renderApp();
  }
}

function deleteSelectedRecord() {
  const idx = state.transactions.findIndex(t => t.id === state.selectedTransactionId);
  if (idx !== -1) {
    const removed = state.transactions.splice(idx, 1)[0];
    state.logActivity(`Deleted ledger entry for "${removed.name}".`, "🗑️");
    state.save();
    renderApp();
  }
}

// ==========================================================================
// 9. Quick Add Form Modals Processor
// ==========================================================================
function createRecordFromForm() {
  const name = document.getElementById("form-name").value.trim() || "Untitled";
  const type = document.getElementById("form-type").value;
  const amount = Number(document.getElementById("form-amount").value) || 0;
  const date = document.getElementById("form-date").value || new Date().toISOString().split('T')[0];
  const status = document.getElementById("form-status").value;
  const rawTags = document.getElementById("form-tags").value;
  const description = document.getElementById("form-description").value.trim();
  
  const tags = rawTags.split(",")
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  if (tags.length === 0) tags.push("General");
  
  // Ensure person column exists
  if (!state.people.some(p => p.toLowerCase() === name.toLowerCase())) {
    state.people.push(name);
  }

  const newTx = {
    id: "tx-" + Date.now(),
    emoji: "",
    name,
    amount,
    type,
    date,
    status,
    description,
    tags,
    color: "none",
    priority: "medium",
    audit: [
      { time: new Date().toISOString(), text: "Record created via Quick Add Panel." }
    ]
  };
  
  state.transactions.push(newTx);
  state.logActivity(`Created new transaction for ${name} (${formatCurrency(amount)}).`, "💰");
  
  if (status === "paid") {
    triggerConfetti();
  }
  
  state.save();
  renderApp();
}

// ==========================================================================
// 10. Backup Utility: Excel/Sheets CSV Importer & Exporter
// ==========================================================================
function exportToCSV() {
  if (state.transactions.length === 0) {
    alert("There are no entries to export in the current ledger sheet.");
    return;
  }
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Person Name,Flow Type,Amount,Date,Status,Tags,Notes/Description\r\n";
  
  state.transactions.forEach(t => {
    const row = [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      t.amount,
      `"${t.date}"`,
      `"${t.status}"`,
      `"${t.tags.join(' | ')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(",") + "\r\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `LedgerFlow_Spreadsheet_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  state.logActivity("Exported spreadsheet database to CSV file.", "📥");
}

function importFromCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) {
      alert("Invalid CSV format. Please export a CSV template from LedgerFlow first.");
      return;
    }
    
    const importedTxs = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!matches || matches.length < 6) continue;
      
      const cleanVal = (str) => str.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      
      const name = cleanVal(matches[0]);
      const type = cleanVal(matches[1]) === "borrowed" ? "borrowed" : "lent";
      const amount = Number(cleanVal(matches[2])) || 0;
      const date = cleanVal(matches[3]);
      const status = cleanVal(matches[4]);
      
      const tagsRaw = matches[5] ? cleanVal(matches[5]) : "";
      const tags = tagsRaw.split("|").map(t => t.trim()).filter(t => t.length > 0);
      if (tags.length === 0) tags.push("Imported");
      
      const description = matches[6] ? cleanVal(matches[6]) : "";
      
      importedTxs.push({
        id: `tx-import-${Date.now()}-${i}`,
        name,
        amount,
        type,
        date,
        status,
        description,
        tags,
        color: "none",
        priority: "medium",
        audit: [{ time: new Date().toISOString(), text: "Record imported from CSV backup." }]
      });
    }
    
    if (importedTxs.length > 0) {
      if (confirm(`Successfully read ${importedTxs.length} items from CSV. Would you like to merge these with your active sheet? (Selecting 'Cancel' overwrites the sheet entirely)`)) {
        state.transactions = [...state.transactions, ...importedTxs];
      } else {
        state.transactions = importedTxs;
      }
      
      state.people = state.extractPeopleFromTransactions();
      
      state.logActivity(`Successfully imported ${importedTxs.length} entries from CSV.`, "📤");
      state.save();
      renderApp();
      alert(`Ledger sheets updated. Successfully loaded ${importedTxs.length} items.`);
    } else {
      alert("No valid entries could be parsed from the CSV file.");
    }
  };
  reader.readAsText(file);
  el.csvFileInput.value = "";
}

// ==========================================================================
// 11. Custom Gravity Confetti Burst Canvas System
// ==========================================================================
function triggerConfetti() {
  const canvas = el.confettiCanvas;
  const ctx = canvas.getContext("2d");
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e"];
  
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 50,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 15,
      vy: -Math.random() * 20 - 10,
      radius: Math.random() * 4 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01
    });
  }
  
  let animationId = null;
  
  const updateAndDraw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let active = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5;
      p.alpha -= p.decay;
      
      if (p.alpha > 0) {
        active = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }
    });
    
    if (active) {
      animationId = requestAnimationFrame(updateAndDraw);
    } else {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  updateAndDraw();
}
