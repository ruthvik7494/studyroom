import 'server-only';
import * as XLSX from 'xlsx';

export interface ExportRow {
  student: string; centre: string; period: string; amount: number;
  status: string; payment: string; starts_at: string; created_at?: string;
}

const HEADERS = ['Student', 'Centre', 'Period', 'Amount (INR)', 'Status', 'Payment', 'Start', 'Booked'];

/**
 * SECURITY: neutralize spreadsheet formula injection ("CSV injection").
 * `student` (booking user's full_name) and `centre` (owner-supplied) are only
 * length-validated, not character-restricted — a value like
 * `=HYPERLINK("http://evil","x")` would execute as a live formula the moment
 * an admin/owner opens the exported file in Excel/Sheets. Any string cell
 * whose first character is one Excel/Sheets treats as a formula/DDE trigger
 * (= + - @, plus tab/CR) gets a leading apostrophe, which forces it to be
 * read as literal text instead of evaluated.
 */
function neutralizeFormula(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function toMatrix(rows: ExportRow[]): (string | number)[][] {
  return rows.map((r) => [
    neutralizeFormula(r.student), neutralizeFormula(r.centre), r.period, r.amount, r.status, r.payment,
    r.starts_at ? new Date(r.starts_at).toISOString().slice(0, 16).replace('T', ' ') : '',
    r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
  ]);
}

/** CSV string (kept for the existing CSV export). */
export function toCsv(rows: ExportRow[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [HEADERS.join(','), ...toMatrix(rows).map((r) => r.map(esc).join(','))].join('\n');
}

/** Native .xlsx buffer with headers, formatted dates, and auto-sized columns. */
export function toXlsx(rows: ExportRow[]): Buffer {
  const aoa = [HEADERS, ...toMatrix(rows)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-size columns from content width.
  ws['!cols'] = HEADERS.map((h, i) => {
    const maxLen = Math.max(h.length, ...aoa.slice(1).map((row) => String(row[i] ?? '').length));
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
