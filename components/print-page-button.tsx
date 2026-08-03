'use client';

import { Download } from 'lucide-react';

/**
 * "Download PDF" affordance for legal pages. There's no pre-generated PDF
 * file to link to, so this opens the browser's print dialog (which offers
 * "Save as PDF") against the current page instead of pointing at a 404.
 */
export function PrintPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
    >
      <Download className="h-4 w-4" aria-hidden />
      Download PDF
    </button>
  );
}
