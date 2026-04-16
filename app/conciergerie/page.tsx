import type { Metadata } from 'next';
import { Check, Star, Sparkles, Mail } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Conciergerie — RentaVision',
  description: 'Déléguez la gestion de votre bien en location courte durée. Pack Lancement ou Gestion Complète : nous nous occupons de tout.',
};

const CONTACT_EMAIL = 'lomig.gauvin@gmail.com';
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande d'information - Conciergerie Rentavision")}`;

export default function ConciergeriePage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0c1222] text-[#f8fafc] pt-20">

        {/* ── Hero ── */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs font-['Inter'] font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Service de conciergerie
          </div>
          <h1 className="font-['DM_Sans'] text-4xl md:text-5xl font-bold text-[#f8fafc] leading-tight mb-4">
            Déléguez la gestion de votre bien{' '}
            <span className="bg-gradient-to-r from-[#10b981] to-[#3b82f6] bg-clip-text text-transparent">
              en toute sérénité
            </span>
          </h1>
          <p className="text-[#94a3b8] font-['Inter'] text-lg max-w-xl mx-auto leading-relaxed">
            Vous avez le bien, nous gérons tout le reste — de la création de l&apos;annonce aux
            check-outs, en passant par la communication avec les voyageurs.
          </p>
        </section>

        {/* ── Pricing Cards ── */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Carte 1 : Pack Lancement ── */}
            <div className="relative flex flex-col p-8 rounded-2xl bg-[#0f172a] border border-white/[0.08] hover:border-[#3b82f6]/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                <span className="text-xs font-['Inter'] font-semibold text-[#3b82f6] uppercase tracking-wider">
                  Paiement unique
                </span>
              </div>
              <h2 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-1">
                Pack Lancement
              </h2>
              <p className="text-sm text-[#64748b] font-['Inter'] mb-6">
                Idéal pour partir du bon pied dès votre premier bien
              </p>

              <div className="flex items-end gap-1 mb-8">
                <span className="font-['DM_Sans'] text-5xl font-bold text-[#f8fafc]">150</span>
                <span className="text-2xl font-['DM_Sans'] font-bold text-[#f8fafc] mb-1">€</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Création complète du compte Airbnb',
                  'Shooting photo de l\'appartement',
                  'Rédaction de l\'annonce optimisée',
                  'Mise en ligne et paramétrage initial',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#cbd5e1] font-['Inter']">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={MAILTO}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 hover:border-[#3b82f6]/60 text-[#3b82f6] font-['Inter'] font-semibold text-sm transition-all"
              >
                <Mail className="w-4 h-4" />
                Je suis intéressé
              </a>
            </div>

            {/* ── Carte 2 : Gestion Complète ── */}
            <div className="relative flex flex-col p-8 rounded-2xl bg-[#0f172a] border border-[#10b981]/30 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
              {/* Badge populaire */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981] text-[#0c1222] text-[11px] font-['Inter'] font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                  <Star className="w-3 h-3 fill-current" />
                  Le plus demandé
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-xs font-['Inter'] font-semibold text-[#10b981] uppercase tracking-wider">
                  Commission sur revenus
                </span>
              </div>
              <h2 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-1">
                Gestion Complète
              </h2>
              <p className="text-sm text-[#64748b] font-['Inter'] mb-6">
                Nous gérons votre bien de A à Z, vous encaissez
              </p>

              <div className="flex items-end gap-1 mb-1">
                <span className="font-['DM_Sans'] text-5xl font-bold text-[#f8fafc]">20</span>
                <span className="text-2xl font-['DM_Sans'] font-bold text-[#f8fafc] mb-1">%</span>
              </div>
              <p className="text-xs text-[#64748b] font-['Inter'] mb-8">des revenus générés</p>

              <ul className="space-y-3 mb-4 flex-1">
                {[
                  'Conciergerie de A à Z',
                  'Gestion des voyageurs et de la communication',
                  'Check-in & check-out coordonnés',
                  'Gestion des avis et du calendrier',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#cbd5e1] font-['Inter']">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Note frais de ménage */}
              <div className="mb-6 px-4 py-3 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/20 flex items-start gap-2.5">
                <span className="text-sm shrink-0 leading-none mt-0.5">💡</span>
                <p className="text-xs text-[#cbd5e1] font-['Inter'] leading-relaxed">
                  <span className="font-semibold text-[#f59e0b]">+ 30 € de frais de ménage</span>{' '}
                  — directement pris en charge par le voyageur, sans impact sur votre rémunération.
                </p>
              </div>

              <a
                href={MAILTO}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] font-['Inter'] font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)]"
              >
                <Mail className="w-4 h-4" />
                Démarrer avec ce pack
              </a>
            </div>
          </div>

          {/* ── CTA global ── */}
          <div className="mt-10 text-center">
            <p className="text-[#64748b] font-['Inter'] text-sm mb-4">
              Une question avant de vous lancer ? Écrivez-nous, nous répondons sous 24 h.
            </p>
            <a
              href={MAILTO}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-[#10b981] to-[#3b82f6] hover:opacity-90 text-[#0c1222] font-['Inter'] font-bold text-base transition-all shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]"
            >
              <Mail className="w-5 h-5" />
              Contactez-nous pour démarrer
            </a>
            <p className="mt-3 text-xs text-[#475569] font-['Inter']">
              {CONTACT_EMAIL}
            </p>
          </div>
        </section>

      </main>
    </>
  );
}
