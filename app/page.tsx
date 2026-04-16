'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Home, Brain, Trophy, TrendingUp,
  Receipt, BarChart3, Star, Mail, Twitter, Linkedin, Github, Heart, LineChart, Check, X
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AuthModal from '@/components/layout/AuthModal';
import { useAuth } from '@/components/layout/AuthProvider';

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleCTA = () => {
    //if (user) {
      router.push('/simulation');
    //} else {
    //  setShowModal(true);
    //}
  };

  const faqs = [
    {
      question: "D'où proviennent vos données de marché ?",
      answer: "Nous utilisons l'API AirDNA pour obtenir des données en temps réel sur les loyers, les prix Airbnb et les taux d'occupation par ville."
    },
    {
      question: "Est-ce vraiment 100% gratuit ?",
      answer: "Oui, l'accès à RentaVision est entièrement gratuit. Aucune carte bancaire n'est requise pour faire une simulation."
    },
    {
      question: "Quels régimes fiscaux sont pris en compte ?",
      answer: "Nous intégrons tous les régimes : LMNP (Réel et Micro-BIC), Foncier (Réel et Micro-foncier), ainsi que votre TMI personnalisé."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Absolument. Toutes vos données sont chiffrées et ne sont jamais partagées avec des tiers. Votre confidentialité est notre priorité."
    }
  ];

  const testimonials = [
    {
      text: "Je pensais que mon Airbnb était rentable. RentaVision m'a prouvé qu'en comptant mon temps et la CFE, je perdais de l'argent par rapport au LMNP classique. Une révélation !",
      author: "Thomas",
      city: "Lyon"
    },
    {
      text: "Les projections sur 15 ans m'ont ouvert les yeux. J'ai compris que la stratégie mixte était idéale pour mon appartement à Nice. Merci RentaVision !",
      author: "Marie",
      city: "Nice"
    },
    {
      text: "Simple, rapide et précis. J'ai pu comparer 3 biens différents en moins d'une heure. L'intégration fiscale est vraiment top.",
      author: "Pierre",
      city: "Bordeaux"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0c1222] font-['Inter'] text-[#f8fafc] selection:bg-[#3b82f6]/30">
      <Navbar />

      <main className={showModal ? 'filter blur-sm opacity-50 pointer-events-none transition-all duration-300' : ''}>
        {/* ── HERO ── */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0c1222] via-[#0c1222]/50 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[#10b981] text-xs font-['JetBrains_Mono'] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                NOUVEAU : INTÉGRATION FISCALE LMNP
              </div>

              <h1 className="font-['DM_Sans'] text-5xl lg:text-6xl font-bold text-[#f8fafc] leading-[1.1] tracking-tight">
                Révélez le potentiel réel de{' '}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f59e0b]">
                  votre patrimoine
                </span>
              </h1>

              <p className="font-['Inter'] text-lg text-[#94a3b8] leading-relaxed max-w-xl">
                Ne jouez plus aux devinettes. Comparez instantanément les stratégies Longue Durée, Courte Durée et Mixte avec une fiscalité nette précise et des projections sur 15 ans.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCTA}
                  className="px-8 py-4 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] text-sm font-['Inter'] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  Faites une simulation gratuite
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <div key={letter} className="w-8 h-8 rounded-full border-2 border-[#0c1222] bg-[#334155] flex items-center justify-center text-[10px] font-bold text-[#f8fafc]">
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-[#94a3b8]">
                  <span className="font-semibold text-[#f8fafc]">+2 500 investisseurs</span> ont optimisé leur rendement
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8b5cf6]/20 rounded-3xl blur-2xl transform rotate-3" />
              <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/90 rounded-3xl border border-white/[0.10] shadow-2xl overflow-hidden min-h-[380px] flex items-center justify-center">
                {/* Mini dashboard preview */}
                <div className="p-6 w-full space-y-4">
                  <div className="flex gap-3">
                    {[
                      { label: 'Longue Durée', cf: '+320 €', color: 'border-[#3b82f6]/40 bg-[#3b82f6]/5' },
                      { label: 'Courte Durée', cf: '+780 €', color: 'border-[#f59e0b]/40 bg-[#f59e0b]/5', best: true },
                      { label: 'Mixte', cf: '+560 €', color: 'border-[#8b5cf6]/40 bg-[#8b5cf6]/5' },
                    ].map((s) => (
                      <div key={s.label} className={`flex-1 p-3 rounded-xl border ${s.color} relative`}>
                        {s.best && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#f59e0b] rounded-full text-[#0c1222] text-[9px] font-bold whitespace-nowrap">
                            ⭐ Meilleur
                          </div>
                        )}
                        <div className="text-[10px] text-[#94a3b8] font-['Inter'] mb-1">{s.label}</div>
                        <div className="text-[#10b981] font-['JetBrains_Mono'] font-bold text-sm">{s.cf}/mois</div>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart bars */}
                  <div className="flex items-end gap-1 h-20 px-2">
                    {[40, 55, 45, 65, 70, 85, 90, 88, 72, 65, 55, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm opacity-60"
                        style={{
                          height: `${h}%`,
                          background: i >= 5 && i <= 7
                            ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
                            : 'linear-gradient(to top, #3b82f6, #60a5fa)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] text-[#94a3b8]">Rendement net</div>
                      <div className="text-[#10b981] font-['JetBrains_Mono'] font-bold">8.4%</div>
                    </div>
                    <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] text-[#94a3b8]">Fiscalité</div>
                      <div className="text-[#f8fafc] font-['JetBrains_Mono'] font-bold text-xs">LMNP Réel</div>
                    </div>
                    <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] text-[#94a3b8]">Patrimoine 15 ans</div>
                      <div className="text-[#8b5cf6] font-['JetBrains_Mono'] font-bold text-xs">+243k€</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-[#0f172a]/90 backdrop-blur-md border border-white/[0.10] shadow-xl flex items-center gap-3 animate-bounce-slow">
                <div className="w-10 h-10 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8] font-['Inter']">Rendement Net</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#f8fafc]">+12.4%</div>
                </div>
              </div>

              <div className="absolute -top-3 -right-3 p-4 rounded-2xl bg-[#0f172a]/90 backdrop-blur-md border border-white/[0.10] shadow-xl flex items-center gap-3" style={{ animation: 'bounce 4s infinite 1s' }}>
                <div className="w-10 h-10 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6]">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8] font-['Inter']">Fiscalité</div>
                  <div className="text-lg font-bold font-['JetBrains_Mono'] text-[#f8fafc]">LMNP Réel</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMMENT ÇA MARCHE ── */}
        <section className="py-24 border-t border-white/[0.05] bg-[#0c1222]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] mb-4">Analysez votre bien en 3 étapes</h2>
              <p className="text-[#94a3b8] font-['Inter'] max-w-2xl mx-auto">
                Notre moteur intelligent calcule la rentabilité réelle en intégrant les frais, les impôts et les données de marché locales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Entrez les données', desc: "Saisissez l'adresse, le prix, les travaux. Notre API récupère les loyers du quartier instantanément.", Icon: Home },
                { step: '02', title: "L'IA analyse le marché", desc: "Comparaison automatique avec les prix Airbnb et le taux d'occupation local en temps réel.", Icon: Brain },
                { step: '03', title: 'Découvrez la stratégie', desc: "Visualisez le scénario gagnant. Cash-flow net, impôts déduits, et évolution sur 15 ans.", Icon: Trophy },
              ].map((item) => (
                <div key={item.step} className="relative group p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-['JetBrains_Mono'] text-6xl font-bold text-[#f8fafc] group-hover:opacity-20 transition-opacity">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <item.Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-['DM_Sans'] text-xl font-bold text-[#f8fafc] mb-3">{item.title}</h3>
                  <p className="text-[#94a3b8] font-['Inter'] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POURQUOI NOUS CHOISIR ── */}
        <section className="py-24 border-t border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] mb-4">Pourquoi choisir RentaVision ?</h2>
              <p className="text-[#94a3b8] font-['Inter']">
                Tout ce dont un investisseur a besoin pour prendre les bonnes décisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Comparaison des 3 scénarios',
                  desc: "Longue Durée, Courte Durée (Airbnb) et Mixte comparés côte à côte avec toutes les charges réelles.",
                  color: 'border-[#3b82f6]/20 hover:border-[#3b82f6]/40',
                  iconBg: 'bg-[#3b82f6]',
                  Icon: TrendingUp,
                },
                {
                  title: 'Fiscalité Réelle Intégrée',
                  desc: "Calculs précis en LMNP, Micro-BIC ou Foncier. Nous intégrons votre TMI pour un résultat net-net fiable.",
                  color: 'border-[#f59e0b]/20 hover:border-[#f59e0b]/40',
                  iconBg: 'bg-[#f59e0b]',
                  Icon: Receipt,
                },
                {
                  title: 'Projections 15 Ans',
                  desc: "Anticipez la valorisation de votre patrimoine, le capital remboursé et les cash-flows cumulés sur le long terme.",
                  color: 'border-[#8b5cf6]/20 hover:border-[#8b5cf6]/40',
                  iconBg: 'bg-[#8b5cf6]',
                  Icon: BarChart3,
                },
              ].map((item) => (
                <div key={item.title} className={`p-8 rounded-2xl bg-[#0f172a] border ${item.color} transition-all`}>
                  <div className={`w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center text-white mb-6`}>
                    <item.Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-['DM_Sans'] text-xl font-bold text-[#f8fafc] mb-3">{item.title}</h3>
                  <p className="text-[#94a3b8] font-['Inter']">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TÉMOIGNAGES ── */}
        <section className="py-24 border-t border-white/[0.05] bg-[#0c1222]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] mb-4">Ils ont optimisé leur rentabilité</h2>
              <p className="text-[#94a3b8] font-['Inter']">Découvrez ce que nos utilisateurs disent de RentaVision.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, idx) => (
                <div key={idx} className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-[#f8fafc] font-['Inter'] leading-relaxed mb-6 italic flex-1">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <p className="text-sm font-['Inter'] font-medium text-[#94a3b8]">
                    {t.author}, propriétaire à {t.city}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-24 border-t border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="font-['DM_Sans'] text-3xl font-bold text-[#f8fafc] mb-4">Questions fréquentes</h2>
              <p className="text-[#94a3b8] font-['Inter']">Tout ce que vous devez savoir sur RentaVision.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {faqs.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-['DM_Sans'] text-lg font-bold text-[#f8fafc]">{item.question}</h3>
                    <div className={`w-5 h-5 rounded-full border border-white/[0.20] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${openFaq === idx ? 'bg-[#3b82f6] border-[#3b82f6]' : ''}`}>
                      {openFaq === idx
                        ? <X className="w-3 h-3 text-white" />
                        : <span className="text-[#94a3b8] text-xs">+</span>
                      }
                    </div>
                  </div>
                  {openFaq === idx && (
                    <p className="text-[#94a3b8] font-['Inter'] leading-relaxed mt-3 animate-fade-in-down">
                      {item.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="py-24 border-t border-white/[0.05] bg-[#0c1222] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#10b981]/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
            <h2 className="font-['DM_Sans'] text-4xl lg:text-5xl font-bold text-[#f8fafc] mb-6 leading-tight">
              Prêt à prendre les bonnes décisions pour votre patrimoine ?
            </h2>
            <p className="text-[#94a3b8] font-['Inter'] text-lg mb-10 max-w-2xl mx-auto">
              Rejoignez plus de 2 500 investisseurs qui ont déjà optimisé leur rendement immobilier avec RentaVision.
            </p>
            <button
              onClick={handleCTA}
              className="px-10 py-5 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] text-base font-['Inter'] font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 mx-auto"
            >
              Faites une simulation gratuite
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-[#64748b] font-['Inter'] mt-4">
              Sans engagement • Pas de carte bancaire requise
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-16 border-t border-white/[0.05] bg-[#0c1222]">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <span className="font-['DM_Sans'] font-bold text-xl text-[#f8fafc] tracking-tight">RentaVision</span>
                </div>
                <p className="text-sm text-[#64748b] font-['Inter'] leading-relaxed">
                  L'outil ultime pour investisseurs immobiliers. Comparez stratégies, fiscalité et rentabilité avec précision.
                </p>
              </div>

              {[
                { title: 'Légal', links: ['Mentions Légales', 'CGU', 'Politique de confidentialité'] },
                { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'API'] },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="font-['DM_Sans'] text-sm font-bold text-[#f8fafc] uppercase tracking-wider mb-4">{col.title}</h4>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm text-[#94a3b8] font-['Inter'] hover:text-[#f8fafc] transition-colors">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <h4 className="font-['DM_Sans'] text-sm font-bold text-[#f8fafc] uppercase tracking-wider mb-4">Contact</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#64748b]" />
                    <a href="mailto:hello@rentavision.com" className="text-sm text-[#94a3b8] font-['Inter'] hover:text-[#f8fafc] transition-colors">
                      hello@rentavision.com
                    </a>
                  </li>
                  <li className="flex items-center gap-4 pt-2">
                    {[Twitter, Linkedin, Github].map((Icon, i) => (
                      <a key={i} href="#" className="text-[#64748b] hover:text-[#f8fafc] transition-colors">
                        <Icon className="w-5 h-5" />
                      </a>
                    ))}
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-[#64748b] font-['Inter']">© 2024 RentaVision. Tous droits réservés.</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#64748b] font-['Inter']">Fait avec</span>
                <Heart className="w-4 h-4 text-[#ef4444] fill-[#ef4444]" />
                <span className="text-sm text-[#64748b] font-['Inter']">en France</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {showModal && (
        <AuthModal onClose={() => setShowModal(false)} redirectTo="/simulation" />
      )}
    </div>
  );
}
