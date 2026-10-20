import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileCheck2,
  AlertTriangle,
  AlertCircle,
  Download,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { validateInvoiceFile, FileValidationResult } from '../utils/fileValidation.ts';
import { normalizeInvoiceRows } from '../utils/azureInvoiceParser.ts';
import { SAMPLE_RAW_AZURE_CSV } from '../data/sampleAzureInvoices.ts';
import type { NormalizedCostRecord } from '../types/azure.ts';

interface SecureUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRecords: (newRecords: NormalizedCostRecord[], replaceExisting: boolean) => void;
}

export const SecureUploadModal: React.FC<SecureUploadModalProps> = ({
  isOpen,
  onClose,
  onImportRecords,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<FileValidationResult[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFiles = async (files: FileList | File[]) => {
    setIsValidating(true);
    const results: FileValidationResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await validateInvoiceFile(file);
      results.push(res);
    }

    setValidationResults(prev => [...prev, ...results]);
    setIsValidating(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveResult = (idx: number) => {
    setValidationResults(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_RAW_AZURE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-azure-subscription-invoice.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validFilesCount = validationResults.filter(r => r.isValid).length;
  const totalRowsReady = validationResults
    .filter(r => r.isValid)
    .reduce((acc, r) => acc + r.validRowsCount, 0);

  const handleConfirmImport = async () => {
    const allImportedRecords: NormalizedCostRecord[] = [];

    for (const valRes of validationResults) {
      if (!valRes.isValid) continue;
      // Re-read or retrieve rows from validation results
      // In validateInvoiceFile, we have headers and sample, but let's re-normalize from the rows
      // We can normalize directly from valRes.headers and the files or parse the files
      // To ensure high fidelity:
      // Let's create NormalizedCostRecords from the validated rows
      const file = fileInputRef.current?.files
        ? Array.from(fileInputRef.current.files).find(f => f.name === valRes.fileName)
        : null;

      let fileText = '';
      if (file) {
        fileText = await file.text();
      } else {
        // Fallback for sample file
        fileText = SAMPLE_RAW_AZURE_CSV;
      }

      const { headers, rows } = (await import('../utils/azureInvoiceParser.ts')).parseCSV(fileText);
      const records = normalizeInvoiceRows(headers, rows, valRes.fileName, valRes.detectedColumns);
      allImportedRecords.push(...records);
    }

    if (allImportedRecords.length > 0) {
      onImportRecords(allImportedRecords, replaceExisting);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-lg font-bold text-slate-900">
                Upload Azure Invoice CSV Files
              </h2>
              <p className="text-xs text-slate-500">
                Secure validation for Azure Cost Management, EA Portal, or MCA billing exports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close upload modal"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Security Notice */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold">Local & Client-Side Processing:</span> Your Azure invoices are analyzed securely in-memory. File headers, numerical cost values, and reservation components (VM, App Services, AKS, SQL, SQL MI) are automatically classified.
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <div className="text-sm font-semibold text-slate-800">
              Drag & drop Azure CSV files here, or <span className="text-blue-600 underline">browse</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports .csv or .txt (Max 25MB per file). Multi-subscription batch uploads enabled.
            </p>
          </div>

          {/* Sample CSV Download Link */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Need a test file formatted with Azure reservations?</span>
            <button
              onClick={handleDownloadSample}
              className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample Azure Invoice CSV
            </button>
          </div>

          {/* Validation Status List */}
          {isValidating && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-600 animate-pulse">
              Validating file schemas, inspecting headers, and verifying cost columns...
            </div>
          )}

          {validationResults.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Validation Results ({validationResults.length} files)</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {validFilesCount} Valid · {totalRowsReady} Rows
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {validationResults.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      res.status === 'valid'
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : res.status === 'warning'
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {res.status === 'valid' && (
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {res.status === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      {res.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {res.fileName}{' '}
                          <span className="font-mono text-slate-500 font-normal">
                            ({(res.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        {res.isValid ? (
                          <div className="text-slate-600 mt-1 space-y-0.5">
                            <div>
                              <span className="font-mono tabular-nums font-semibold text-slate-800">
                                {res.validRowsCount}
                              </span>{' '}
                              valid billing records detected
                            </div>
                            {res.detectedSubscriptions.length > 0 && (
                              <div className="text-[11px] text-slate-500 truncate">
                                Subscriptions: {res.detectedSubscriptions.join(', ')}
                              </div>
                            )}
                            {res.warnings.map((w, wIdx) => (
                              <div key={wIdx} className="text-amber-700 text-[11px]">
                                Notice: {w}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-rose-700 font-medium mt-1">
                            {res.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveResult(idx)}
                      aria-label={`Remove file ${res.fileName}`}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merge Option Checkbox */}
          {validFilesCount > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Replace currently loaded data (otherwise merges and consolidates)</span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={validFilesCount === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4" />
            Consolidate {validFilesCount} File{validFilesCount !== 1 ? 's' : ''} ({totalRowsReady} Rows)
          </button>
        </div>
      </div>
    </div>
  );
};
