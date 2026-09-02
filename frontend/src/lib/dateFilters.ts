export type DateFilterType = 'ALL' | 'FY_25_26' | 'FY_24_25' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'MONTH';

export interface DateFilter {
  type: DateFilterType;
  monthValue?: string; // Format: YYYY-MM
}

export function isTxInDateRange(txDateStr: string, filter: DateFilter): boolean {
  if (!txDateStr) return false;
  if (filter.type === 'ALL') return true;

  // Split to get YYYY-MM-DD parts cleanly
  const cleanDateStr = txDateStr.split('T')[0];
  const dateParts = cleanDateStr.split('-');
  if (dateParts.length < 3) return false;
  
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]); // 1-indexed
  const day = Number(dateParts[2]);

  const txVal = year * 10000 + month * 100 + day;

  switch (filter.type) {
    case 'FY_25_26':
      return txVal >= 20250401 && txVal <= 20260331;
    case 'FY_24_25':
      return txVal >= 20240401 && txVal <= 20250331;
    case 'Q1': // Apr - Jun
      return month >= 4 && month <= 6;
    case 'Q2': // Jul - Sep
      return month >= 7 && month <= 9;
    case 'Q3': // Oct - Dec
      return month >= 10 && month <= 12;
    case 'Q4': // Jan - Mar
      return month >= 1 && month <= 3;
    case 'MONTH': {
      if (!filter.monthValue) return true;
      const [fYear, fMonth] = filter.monthValue.split('-').map(Number);
      return year === fYear && month === fMonth;
    }
    default:
      return true;
  }
}
