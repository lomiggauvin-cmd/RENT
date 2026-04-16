'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LineChart, ChevronDown, LogOut, FolderOpen, History, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/layout/AuthProvider';
import { signOut } from '@/lib/supabase';


export default function Navbar() {
  const { user, loading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setShowDropdown(false);
    router.push('/');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0c1222]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <LineChart className="w-5 h-5" />
            </div>
            <span className="font-['DM_Sans'] font-bold text-xl text-[#f8fafc] tracking-tight">
              RentaVision
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className={`text-sm font-['Inter'] font-medium transition-colors ${
                pathname === '/' ? 'text-[#f8fafc]' : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Accueil
            </Link>
            <Link
              href="/simulation"
              className={`text-sm font-['Inter'] font-medium transition-colors ${
                pathname === '/simulation' ? 'text-[#3b82f6]' : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Nouvelle Analyse
            </Link>
            <Link
              href="/conciergerie"
              className={`text-sm font-['Inter'] font-medium transition-colors ${
                pathname === '/conciergerie' ? 'text-[#10b981]' : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Conciergerie
            </Link>
            <Link
              href="/historique"
              className={`flex items-center gap-1.5 text-sm font-['Inter'] font-medium transition-colors ${
                pathname === '/historique' ? 'text-[#3b82f6]' : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              <History className="w-4 h-4" />
              Historique
            </Link>
            {user && (
              <Link
                href="/projets"
                className={`text-sm font-['Inter'] font-medium transition-colors ${
                  pathname === '/projets' ? 'text-[#3b82f6]' : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                Mes Projets
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {loading ? (
              <Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" />
            ) : user ? (
              /* User Menu */
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white text-sm font-bold">
                    {user.email?.[0].toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm font-['Inter'] text-[#f8fafc] hidden md:block max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#94a3b8] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#0f172a] border border-white/[0.10] rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-fade-in-down">
                    <div className="p-1">
                      <Link
                        href="/historique"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] text-[#f8fafc] text-sm font-['Inter'] transition-colors"
                      >
                        <History className="w-4 h-4 text-[#94a3b8]" />
                        Historique
                      </Link>
                      <Link
                        href="/projets"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] text-[#f8fafc] text-sm font-['Inter'] transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-[#94a3b8]" />
                        Mes Projets
                      </Link>
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#ef4444]/10 text-[#ef4444] text-sm font-['Inter'] transition-colors"
                      >
                        {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/simulation"
                className="px-5 py-2.5 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#0c1222] text-sm font-['Inter'] font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                Faire une simulation
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Click-outside handler */}
      {showDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
      )}

    </>
  );
}
