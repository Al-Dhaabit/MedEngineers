import React from "react";
import { AlertCircle } from "lucide-react";

export function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = "error" 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
  type?: "error" | "warning" | "info" 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 md:p-8 w-full max-w-sm relative shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${type === 'error' ? 'bg-red-500/10 border-red-500/20' : type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <AlertCircle className={`w-6 h-6 ${type === 'error' ? 'text-red-500' : type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
