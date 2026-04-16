'use client';

import { useState } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';

interface LeadCaptureModalProps {
  onSubmit: (email: string) => void;
  onClose: () => void;
}

export default function LeadCaptureModal({ onSubmit, onClose }: LeadCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Veuillez entrer une adresse email valide.');
      return;
    }
    onSubmit(email.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0f1929] border border-white/[0.12] rounded-2xl shadow-2xl p-8">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748b] hover:text-[#f8fafc] transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 mb-6">
          <Sparkles className="w-6 h-6 text-[#10b981]" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-[#f8fafc] font-['Inter'] mb-2">
          Recevez vos résultats détaillés
        </h2>
        <p className="text-sm text-[#94a3b8] font-['Inter'] mb-6 leading-relaxed">
          Entrez votre email pour accéder à votre analyse complète : rendement net, cashflow, comparatif fiscal et recommandation personnalisée.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#94a3b8] font-['Inter'] uppercase tracking-wider mb-2">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="vous@exemple.com"
                autoFocus
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border text-[#f8fafc] text-sm font-['Inter'] placeholder-[#475569] focus:outline-none focus:ring-1 transition-colors ${
                  error
                    ? 'border-red-500/60 focus:ring-red-500/40'
                    : 'border-white/[0.10] focus:border-[#10b981]/60 focus:ring-[#10b981]/20'
                }`}
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400 font-['Inter']">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] font-bold text-sm font-['Inter'] transition-all shadow-lg shadow-[#10b981]/20 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Lancer mon analyse
          </button>
        </form>

        {/* RGPD */}
        <p className="mt-4 text-center text-[10px] text-[#475569] font-['Inter'] leading-relaxed">
          Vos données sont utilisées uniquement pour vous transmettre vos résultats.<br />
          Aucun spam. Conformément au RGPD, vous pouvez demander la suppression à tout moment.
        </p>
      </div>
    </div>
  );
}
