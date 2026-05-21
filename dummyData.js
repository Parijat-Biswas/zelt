/**
 * Pre-seeded ledger transactions for LedgerFlow.
 * These provide an instant, vibrant look on first load.
 */
const initialTransactions = [
  {
    id: "tx-1",
    name: "Alex Johnson",
    amount: 1550.00,
    type: "lent",
    date: "2026-05-19",
    status: "pending",
    description: "Split for the gourmet wood-fired pizza and drinks we got during the Tuesday night football match.",
    tags: ["Food", "Social"],
    color: "none",
    priority: "medium"
  },
  {
    id: "tx-2",
    name: "Sarah Chen",
    amount: 45000.00,
    type: "lent",
    date: "2026-05-10",
    status: "partial",
    description: "Sold my old OnePlus phone to Sarah. She is paying in monthly installments of ₹15,000. Already paid first ₹15,000.",
    tags: ["Tech", "Sales"],
    color: "none",
    priority: "high"
  },
  {
    id: "tx-3",
    name: "David Miller",
    amount: 3500.00,
    type: "borrowed",
    date: "2026-05-15",
    status: "pending",
    description: "Gas money and toll split for the weekend road trip. Need to transfer back before the end of the week.",
    tags: ["Travel", "Transport"],
    color: "rose-tint",
    priority: "medium"
  },
  {
    id: "tx-4",
    name: "Emma Watson",
    amount: 1200.00,
    type: "lent",
    date: "2026-05-01",
    status: "paid",
    description: "Shared birthday gift for Professor Snape. Bought a custom leather journal.",
    tags: ["Gifts", "Celebration"],
    color: "none",
    priority: "low"
  },
  {
    id: "tx-5",
    name: "Landlord Joe",
    amount: 15000.00,
    type: "borrowed",
    date: "2026-05-05",
    status: "overdue",
    description: "May rent balance. Delayed due to banking transfer holds. Need to pay ASAP to avoid a late fee penalty.",
    tags: ["Rent", "Bills"],
    color: "rose-tint",
    priority: "high"
  },
  {
    id: "tx-6",
    name: "Marcus Aurelius",
    amount: 450.00,
    type: "lent",
    date: "2026-05-20",
    status: "pending",
    description: "Morning espresso and cookies at the local cafe. He forgot his wallet.",
    tags: ["Food", "Daily"],
    color: "none",
    priority: "low"
  }
];

// Export to window object for browser-level access
window.initialTransactions = initialTransactions;
