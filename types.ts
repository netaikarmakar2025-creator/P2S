
export interface ExtractedData {
  fileName: string;
  summary: string;
  // Master metadata fields for the main table
  metadata: {
    name: string;        // E.g., Customer or Vendor Name
    date: string;        // E.g., Invoice Date
    total: string;       // E.g., Subtotal or base total
    grandTotal: string;  // E.g., Final amount
  };
  // Detailed document rows
  headers: string[];
  rows: Record<string, any>[];
}

export interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  data?: ExtractedData;
}
