'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, ArrowLeft, ArrowRight, CheckSquare, Square,
  Loader2, Send, Check, Home,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

// ─── Constants ────────────────────────────────────────────────

const SERVICES_LIST = [
  { id: 'checkin',      label: 'Check-in / Check-out' },
  { id: 'menage',       label: 'Ménage' },
  { id: 'cles',         label: 'Gestion des clés' },
  { id: 'maintenance',  label: 'Maintenance' },
  { id: 'conciergerie', label: 'Conciergerie 24h/7j' },
];

const STEPS = ['Identité', 'Activité', 'Présentation'];

// ─── Sub-components ───────────────────────────────────────────

function InputField({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#94a3b8] mb-2 font-['Inter']">
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#64748b] mt-1.5 font-['Inter']">{hint}</p>}
    </div>
  );
}

function SectionCard({ children, step }: { children: React.ReactNode; step: number }) {
  const accents = [
    'from-[#8b5cf6] to-[#6d28d9]',
    'from-[#8b5cf6] to-[#10b981]',
    'from-[#10b981] to-[#3b82f6]',
  ];
  return (
    <div className="relative rounded-2xl bg-[#0f172a] border border-white/[0.07] overflow-hidden">
      {/* Colored left border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accents[step - 1]}`} />
      <div className="p-7 pl-8">
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function ConciergerieInscriptionPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    villes: '',
    commission: '',
    biens_geres: '',
    experience: '',
    message: '',
  });
  const [services, setServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only allow digits, spaces, and +
    const filtered = raw.replace(/[^\d\s+]/g, '');
    setForm(prev => ({ ...prev, telephone: filtered }));
    if (filtered && !/^[+\d][\d\s]{6,}$/.test(filtered.trim())) {
      setPhoneError('Format invalide — chiffres, espaces et + uniquement (ex : +33 6 00 00 00 00)');
    } else {
      setPhoneError('');
    }
  };

  const toggleService = (id: string) =>
    setServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const canNext1 = !!form.nom && !!form.email && !!form.villes && !phoneError;
  const canSubmit = canNext1;

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/conciergerie-inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          services: services.map(id => SERVICES_LIST.find(s => s.id === id)?.label).join(', '),
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez-nous directement.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] text-sm focus:outline-none focus:border-[#8b5cf6]/60 focus:ring-1 focus:ring-[#8b5cf6]/20 transition-colors placeholder-[#475569]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0c1222] text-[#f8fafc] pt-20">
        <div className="max-w-2xl mx-auto px-6 py-12">

          {/* ── Back link ── */}
          <Link
            href="/conciergerie"
            className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#f8fafc] font-['Inter'] transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la page conciergerie
          </Link>

          {/* ── Hero ── */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#10b981]/20 border border-[#8b5cf6]/20 mb-6">
              <Building2 className="w-8 h-8 text-[#a78bfa]" />
            </div>
            <h1 className="font-['DM_Sans'] text-3xl md:text-4xl font-bold text-[#f8fafc] mb-3">
              Rejoignez notre réseau de{' '}
              <span className="bg-gradient-to-r from-[#8b5cf6] to-[#10b981] bg-clip-text text-transparent">
                conciergeries partenaires
              </span>
            </h1>
            <p className="text-[#94a3b8] font-['Inter'] text-sm max-w-lg mx-auto leading-relaxed">
              Accédez à des propriétaires qualifiés qui cherchent exactement ce que vous proposez.
            </p>

          </div>

          {/* ── Submitted state ── */}
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-6 py-16 px-8 rounded-2xl bg-[#0f172a] border border-[#10b981]/20">
              {/* Animated checkmark */}
              <div className="relative flex items-center justify-center w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-[#10b981]/10 animate-ping" style={{ animationDuration: '1.5s', animationIterationCount: 1 }} />
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/10 border-2 border-[#10b981]/40">
                  <Check className="w-10 h-10 text-[#10b981] stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc]">
                  Dossier envoyé avec succès !
                </h2>
                <p className="text-[#94a3b8] font-['Inter'] text-sm leading-relaxed max-w-sm mx-auto">
                  Votre dossier a bien été reçu, nous vous recontactons sous 48h.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#10b981] to-[#3b82f6] text-[#0c1222] font-['Inter'] font-bold text-sm transition-all hover:opacity-90 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  <Home className="w-4 h-4" />
                  Retour à l&apos;accueil
                </Link>
                <Link
                  href="/conciergerie"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.10] text-[#94a3b8] hover:text-[#f8fafc] font-['Inter'] text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Page conciergerie
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ── Progress bar ── */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  {STEPS.map((label, i) => {
                    const n = i + 1;
                    const done = step > n;
                    const active = step === n;
                    return (
                      <div key={n} className="flex items-center gap-2 flex-1">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-['Inter'] shrink-0 transition-all ${
                          done    ? 'bg-[#10b981] text-[#0c1222]'
                          : active ? 'bg-[#8b5cf6] text-white'
                          :          'bg-white/[0.06] text-[#475569]'
                        }`}>
                          {done ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : n}
                        </div>
                        <span className={`text-xs font-['Inter'] hidden sm:block transition-colors ${
                          active ? 'text-[#f8fafc] font-semibold' : done ? 'text-[#10b981]' : 'text-[#475569]'
                        }`}>{label}</span>
                        {i < STEPS.length - 1 && (
                          <div className="flex-1 h-px mx-3 rounded-full overflow-hidden bg-white/[0.06]">
                            <div
                              className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981] transition-all duration-500"
                              style={{ width: step > n ? '100%' : '0%' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-right text-xs text-[#475569] font-['Inter']">Étape {step} sur {STEPS.length}</p>
              </div>

              {/* ── Étapes 1 & 2 : PAS de <form>, navigation pure ── */}
              <div className="space-y-6">

                {/* ── Étape 1 : Identité ── */}
                {step === 1 && (
                  <SectionCard step={1}>
                    <h2 className="font-['DM_Sans'] text-lg font-bold text-[#f8fafc] mb-6">Identité</h2>
                    <div className="space-y-5">
                      <InputField label="Nom de la société ou Prénom / Nom" required>
                        <input type="text" value={form.nom} onChange={set('nom')}
                          placeholder="Ex : Conciergerie Dupont ou Marie Dupont"
                          className={inputClass} />
                      </InputField>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField label="Email professionnel" required>
                          <input type="email" value={form.email} onChange={set('email')}
                            placeholder="contact@votre-conciergerie.fr"
                            className={inputClass} />
                        </InputField>
                        <InputField label="Téléphone">
                          <input type="tel" value={form.telephone} onChange={handlePhoneChange}
                            placeholder="06 00 00 00 00"
                            className={`${inputClass} ${phoneError ? 'border-[#ef4444]/60 focus:border-[#ef4444]/80 focus:ring-[#ef4444]/20' : ''}`} />
                          {phoneError && (
                            <p className="text-xs text-[#ef4444] mt-1.5 font-['Inter']">{phoneError}</p>
                          )}
                        </InputField>
                      </div>
                      <InputField label="Ville(s) couverte(s)" required hint="Séparez les villes par des virgules">
                        <input type="text" value={form.villes} onChange={set('villes')}
                          placeholder="Ex : Nantes, Saint-Nazaire, La Baule"
                          className={inputClass} />
                      </InputField>
                    </div>
                  </SectionCard>
                )}

                {/* ── Étape 2 : Activité ── */}
                {step === 2 && (
                  <SectionCard step={2}>
                    <h2 className="font-['DM_Sans'] text-lg font-bold text-[#f8fafc] mb-6">Activité</h2>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField label="Commission demandée (%)" hint="Votre taux habituel">
                          <input type="number" min="0" max="100" value={form.commission} onChange={set('commission')}
                            placeholder="Ex : 20"
                            className={inputClass} />
                        </InputField>
                        <InputField label="Biens gérés actuellement">
                          <input type="number" min="0" value={form.biens_geres} onChange={set('biens_geres')}
                            placeholder="Ex : 12"
                            className={inputClass} />
                        </InputField>
                      </div>
                      <InputField label="Années d'expérience dans la gestion locative">
                        <select value={form.experience} onChange={set('experience')} className={selectClass}>
                          <option value="">Sélectionnez…</option>
                          <option value="moins_1">Moins d&apos;1 an</option>
                          <option value="1_3">1 à 3 ans</option>
                          <option value="3_5">3 à 5 ans</option>
                          <option value="plus_5">Plus de 5 ans</option>
                        </select>
                      </InputField>
                      <InputField label="Services proposés">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {SERVICES_LIST.map(({ id, label }) => {
                            const checked = services.includes(id);
                            return (
                              <button key={id} type="button" onClick={() => toggleService(id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-['Inter'] transition-all text-left ${
                                  checked
                                    ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/40 text-[#c4b5fd]'
                                    : 'bg-transparent border-white/[0.08] text-[#64748b] hover:border-white/15 hover:text-[#94a3b8]'
                                }`}>
                                {checked
                                  ? <CheckSquare className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                                  : <Square className="w-4 h-4 shrink-0" />}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </InputField>
                    </div>
                  </SectionCard>
                )}

                {/* ── Étape 3 : Présentation — seul vrai <form> ── */}
                {step === 3 && (
                  <SectionCard step={3}>
                    <h2 className="font-['DM_Sans'] text-lg font-bold text-[#f8fafc] mb-6">Présentation libre</h2>
                    <InputField label="Message / présentation de votre activité">
                      <textarea value={form.message} onChange={set('message')} rows={7}
                        placeholder="Parlez-nous de votre équipe, de votre zone géographique, de vos points forts…"
                        className={`${inputClass} resize-none`} />
                    </InputField>
                  </SectionCard>
                )}

                {/* ── Erreur ── */}
                {error && (
                  <p className="text-sm text-[#ef4444] font-['Inter'] px-1">{error}</p>
                )}

                {/* ── Navigation ── */}
                <div className={`flex gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                  {step > 1 && (
                    <button type="button" onClick={() => setStep(s => s - 1)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.10] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/[0.04] font-['Inter'] text-sm transition-all">
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                  )}

                  {step < 3 ? (
                    <button type="button"
                      disabled={step === 1 && !canNext1}
                      onClick={() => setStep(s => s + 1)}
                      className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold font-['Inter'] text-sm transition-all ${
                        (step === 1 && canNext1) || step > 1
                          ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] hover:opacity-90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                          : 'bg-white/[0.05] text-[#475569] cursor-not-allowed'
                      }`}>
                      Suivant
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="button"
                      disabled={submitting || !canSubmit}
                      onClick={handleSubmit}
                      className={`flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold font-['Inter'] text-base transition-all ${
                        !submitting && canSubmit
                          ? 'bg-gradient-to-r from-[#8b5cf6] to-[#10b981] hover:opacity-90 text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:shadow-[0_0_36px_rgba(139,92,246,0.5)] active:scale-[0.98]'
                          : 'bg-white/[0.05] text-[#475569] cursor-not-allowed'
                      }`}>
                      {submitting
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours…</>
                        : <><Send className="w-5 h-5" /> Envoyer ma candidature</>
                      }
                    </button>
                  )}
                </div>

                <p className="text-center text-[10px] text-[#475569] font-['Inter']">
                  Vos données sont utilisées uniquement dans le cadre de l&apos;évaluation de votre candidature.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
