import type { ColumnMapping } from '../types/azure.ts';
import { detectColumnMapping, parseCSV } from './azureInvoiceParser.ts';

export interface FileValidationResult {
  fileName: string;
  fileSize: number;
  isValid: boolean;
  status: 'valid' | 'warning' | 'error';
  errorMessage?: string;
  warnings: string[];
  detectedColumns: ColumnMapping;
  headers: string[];
  totalRows: number;
  validRowsCount: number;
  samplePreview: Record<string, string>[];
  detectedSubscriptions: string[];
  detectedCurrency: string;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit
const ALLOWED_EXTENSIONS = ['.csv', '.txt'];
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/csv',
  'text/comma-separated-values',
];

/**
 * Sanitizes cell values to prevent CSV formula injection (=, +, -, @, \t, \r)
 * when rendered or exported to Excel.
 */
export function sanitizeCellValue(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  // If the cell begins with dangerous spreadsheet execution prefixes, neutralize with a leading single quote
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Performs strict validation on uploaded files before processing
 */
export async function validateInvoiceFile(file: File): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    fileName: file.name,
    fileSize: file.size,
    isValid: false,
    status: 'error',
    warnings: [],
    detectedColumns: {},
    headers: [],
    totalRows: 0,
    validRowsCount: 0,
    samplePreview: [],
    detectedSubscriptions: [],
    detectedCurrency: 'USD',
  };

  // 1. Extension check
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    result.errorMessage = `Invalid file format "${ext}". Only Azure invoice CSV files (.csv, .txt) are supported.`;
    return result;
  }

  // 2. MIME type check (if browser reported a type)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    result.warnings.push(`Unrecognized MIME type "${file.type}". Inspecting text contents directly.`);
  }

  // 3. File size check
  if (file.size === 0) {
    result.errorMessage = 'The file is empty (0 bytes). Please upload a valid Azure billing or invoice CSV export.';
    return result;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    result.errorMessage = `File size exceeds the 25MB security limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
    return result;
  }

  // 4. Content reading & parsing
  let text = '';
  try {
    text = await file.text();
  } catch {
    result.errorMessage = 'Unable to read file contents. The file may be locked or corrupted.';
    return result;
  }

  // Check for binary or null byte injection
  if (text.includes('\0')) {
    result.errorMessage = 'Security validation failed: Binary or corrupted null bytes detected in CSV text.';
    return result;
  }

  const { headers, rows } = parseCSV(text);
  result.headers = headers;
  result.totalRows = rows.length;

  if (headers.length === 0 || rows.length === 0) {
    result.errorMessage = 'No data rows found in this CSV. Please check the export headers and contents.';
    return result;
  }

  // 5. Column schema detection
  const detected = detectColumnMapping(headers);
  result.detectedColumns = detected;

  // Check for critical minimum requirements: at least a cost/amount column
  if (!detected.cost) {
    result.errorMessage =
      'Missing required Cost/Amount column (e.g. "CostInBillingCurrency", "PreTaxCost", "Cost", "TotalCost", or "Amount").';
    return result;
  }

  if (!detected.subscriptionId && !detected.subscriptionName) {
    result.warnings.push(
      'No explicit Subscription ID/Name column found. The file will be assigned a default subscription identifier.'
    );
  }

  if (!detected.date && !detected.billingPeriod) {
    result.warnings.push(
      'No explicit Date or Billing Period column found. Rows will default to the current billing month.'
    );
  }

  // 6. Inspect sample rows & detect subscriptions/currency
  const costColIdx = headers.findIndex(h => h.toLowerCase() === detected.cost?.toLowerCase());
  const subNameIdx = detected.subscriptionName
    ? headers.findIndex(h => h.toLowerCase() === detected.subscriptionName?.toLowerCase())
    : -1;
  const currColIdx = detected.currency
    ? headers.findIndex(h => h.toLowerCase() === detected.currency?.toLowerCase())
    : -1;

  const subsSet = new Set<string>();
  let validRows = 0;

  rows.forEach((row) => {
    const rawCost = costColIdx >= 0 ? row[costColIdx] : '';
    if (rawCost && !isNaN(parseFloat(rawCost.replace(/[^0-9.-]/g, '')))) {
      validRows++;
    }
    if (subNameIdx >= 0 && row[subNameIdx]) {
      subsSet.add(sanitizeCellValue(row[subNameIdx]));
    }
    if (currColIdx >= 0 && row[currColIdx]) {
      result.detectedCurrency = sanitizeCellValue(row[currColIdx]).toUpperCase();
    }
  });

  result.validRowsCount = validRows;
  result.detectedSubscriptions = Array.from(subsSet).slice(0, 10);

  // Build sanitized sample preview (up to 5 rows)
  result.samplePreview = rows.slice(0, 5).map(row => {
    const obj: Record<string, string> = {};
    headers.slice(0, 8).forEach((h, idx) => {
      obj[h] = sanitizeCellValue(row[idx] || '');
    });
    return obj;
  });

  result.isValid = true;
  result.status = result.warnings.length > 0 ? 'warning' : 'valid';

  return result;
}
