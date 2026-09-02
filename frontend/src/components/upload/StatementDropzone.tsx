'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Lock, Loader2, RefreshCw } from 'lucide-react';

interface StatementDropzoneProps {
  onUpload: (file: File, password?: string) => Promise<void>;
  loading: boolean;
}

export function StatementDropzone({ onUpload, loading }: StatementDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.name.endsWith('.pdf')) {
      setError('Only PDF statements are supported.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      await onUpload(file, password || undefined);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check password or statement formatting.');
    }
  };

  const handleClear = () => {
    setFile(null);
    setPassword('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)]">
      <div className="mb-6">
        <h4 className="text-base font-bold text-slate-900 tracking-tight">Ingest Bank PDF Statement</h4>
        <p className="text-xs text-slate-400 font-medium">Extract, decrypt, and audit ledger entries in real time</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50/10' 
              : file 
                ? 'border-emerald-300 bg-emerald-50/5' 
                : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleChange}
            className="hidden"
            disabled={loading}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <FileText className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-600">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Drag & drop your statement PDF here</p>
              <p className="text-xs text-slate-400 font-medium">or click to browse local files</p>
            </div>
          )}
        </div>

        {/* Password & Controls */}
        {file && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Statement Password (Optional)
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter PDF password if encrypted"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
                />
                <Lock className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Note: Your statement password is processed locally in-memory and never saved.</p>
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                ⚠️ {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Ledger...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Run Arithmetic Audit
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer transition-all active:scale-[0.98]"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
