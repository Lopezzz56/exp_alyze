export const JARGON_MAP: {
  [key: string]: {
    label: string;
    meaning: string;
    useCase: string;
    badgeStyle: string;
  }
} = {
  'BUSINESS_INCOME': {
    label: 'Business Income (Commission / Dividend)',
    meaning: 'Earnings from commissions, brokerages, stock dividends, and business payouts.',
    useCase: 'Calculates your true revenue for the year and aggregates company payouts.',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
  },
  'PASS_THROUGH_TRANSIT': {
    label: 'Client Transit (Paid for Client)',
    meaning: 'Money you pay out on behalf of clients (e.g., paying an LIC/Star Health premium from your bank account) with the expectation of getting cash back.',
    useCase: 'Keeps this expense off your personal P&L so your profit and tax calculations are not distorted.',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-100/50'
  },
  'INTERNAL_TRANSFER': {
    label: 'Self Transfer (Account to Account)',
    meaning: 'Moving money between your own bank accounts (e.g., BCCB to Kotak).',
    useCase: 'Prevents double-counting transfers as fake income or duplicate expenses.',
    badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-100/50'
  },
  'PERSONAL_EXPENSE': {
    label: 'Personal Outflow (Bills / Living)',
    meaning: 'Routine personal spending (utilities, electricity, dining, groceries).',
    useCase: 'Tracks your actual personal burn rate.',
    badgeStyle: 'bg-rose-50 text-rose-700 border-rose-100/50'
  },
  'UNSETTLED': {
    label: 'Cash Pending from Client',
    meaning: 'A pass-through payment where you have paid online, but the client has not yet handed over the cash.',
    useCase: 'Acts as a receivable list of who owes you money.',
    badgeStyle: 'bg-rose-50 text-rose-700 border-rose-100/50'
  },
  'SETTLED': {
    label: 'Cash Received / Reconciled',
    meaning: 'The client has paid you the cash for their policy premium.',
    useCase: 'Closes the loop, netting out the balance to zero.',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
  }
};
