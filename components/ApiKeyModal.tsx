'use client';

import React, { useState, useEffect } from 'react';
import { Key, X, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Trash2, Map, ShieldAlert } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
  mapEngine: 'maplibre' | 'google';
  onToggleEngine: (engine: 'maplibre' | 'google') => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
  mapEngine,
  onToggleEngine,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState(currentKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setInputKey(currentKey);
  }, [currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey.trim());
    if (inputKey.trim()) {
      onToggleEngine('google');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveKey('');
    onToggleEngine('maplibre');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0E131F] border border-volt-border rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-volt-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00F5A0]/10 border border-[#00F5A0]/20">
              <Key className="w-5 h-5 text-[#00F5A0]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Google Maps API Configuration</h2>
              <p className="text-[11px] text-slate-400">Configure client-side Google Maps Platform rendering</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Engine Switcher */}
        <div className="bg-[#0A0E17] border border-volt-border rounded-lg p-3 space-y-2">
          <span className="text-[11px] font-semibold text-slate-300">Active Map Engine</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleEngine('maplibre')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                mapEngine === 'maplibre'
                  ? 'bg-[#00F5A0]/15 border-[#00F5A0] text-[#00F5A0]'
                  : 'bg-volt-card border-volt-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              MapLibre GL (Open Dark)
            </button>
            <button
              onClick={() => onToggleEngine('google')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                mapEngine === 'google'
                  ? 'bg-[#00D2FF]/15 border-[#00D2FF] text-[#00D2FF]'
                  : 'bg-volt-card border-volt-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Google Maps Platform
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5">Security Architecture:</strong>
            Server secrets are protected via server environment variables. Public browser map tokens are only used for client-side canvas rendering. Configure permanent credentials securely in <code className="text-white bg-slate-900 px-1 py-0.5 rounded">.env.local</code>.
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>Client Google Maps JavaScript Key</span>
            {currentKey ? (
              <span className="text-[10px] text-[#00F5A0] flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Key Active in Session
              </span>
            ) : (
              <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3" /> Defaulting to MapLibre
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-[#0A0E17] border border-volt-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00D2FF] transition-colors"
            />
          </div>
        </div>

        {/* Guide / Required APIs */}
        <div className="bg-[#0A0E17] border border-volt-border/60 rounded-lg p-3 space-y-1.5 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Required Google Cloud APIs:</span>
            <a
              href="https://console.cloud.google.com/google/maps-apis/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D2FF] hover:underline flex items-center gap-1 text-[10px]"
            >
              Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px]">
            <li><strong className="text-slate-200">Maps JavaScript API</strong> (Required for map canvas and dark styles)</li>
            <li><strong className="text-slate-200">Routes API (New)</strong> (Server-side two-wheeler navigation)</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-volt-border/60">
          <button
            onClick={handleClear}
            disabled={!currentKey && !inputKey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Session Key
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#00F5A0] text-[#0A0E17] hover:bg-[#00F5A0]/90 transition-all shadow-md"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Save & Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
