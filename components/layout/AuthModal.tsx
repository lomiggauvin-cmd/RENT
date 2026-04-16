'use client';

import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/supabase';
import { useAuth } from '@/components/layout/AuthProvider';

interface AuthModalProps {
  onClose: () => void;
  redirectTo?: string;
}

export default function AuthModal({ onClose, redirectTo = '/simulation' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        if (data.session) {
          onClose();
          router.push(redirectTo);
        }
      } else {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) throw error;
        if (data.user && !data.session) {
          setSuccessMsg('Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail.');
        } else if (data.session) {
          onClose();
          router.push(redirectTo);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue';
      if (msg.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('User already registered')) {
        setError('Un compte existe déjà avec cet email. Connectez-vous.');
      } else if (msg.includes('Password should be at least')) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Redirect handled by Supabase OAuth flow
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0c1222]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0f172a] border border-white/[0.10] rounded-2xl w-full max-w-md p-8 shadow-2xl animate-fade-in-down">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg font-['DM_Sans']">R</span>
          </div>
          <h3 className="font-['DM_Sans'] text-2xl font-bold text-[#f8fafc] mb-1">Bienvenue</h3>
          <p className="text-[#94a3b8] font-['Inter'] text-sm">Accédez à vos simulations</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white/[0.05] rounded-lg mb-6">
          <button
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-sm font-['Inter'] font-medium rounded transition-all ${
              tab === 'login'
                ? 'text-[#0c1222] bg-[#f8fafc] shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-sm font-['Inter'] font-medium rounded transition-all ${
              tab === 'signup'
                ? 'text-[#0c1222] bg-[#f8fafc] shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] text-[#f8fafc] font-['Inter'] font-medium transition-all mb-6 disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continuer avec Google
        </button>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-white/[0.10]" />
          <span className="flex-shrink-0 mx-4 text-[#64748b] text-xs font-['Inter']">ou</span>
          <div className="flex-grow border-t border-white/[0.10]" />
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-sm font-['Inter']">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-sm font-['Inter']">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-['Inter'] font-medium text-[#94a3b8]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] text-sm focus:outline-none focus:border-[#3b82f6] placeholder-[#475569] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-['Inter'] font-medium text-[#94a3b8]">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[#0c1222] border border-white/[0.10] text-[#f8fafc] font-['Inter'] text-sm focus:outline-none focus:border-[#3b82f6] placeholder-[#475569] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'login' && (
            <div className="text-right">
              <a href="#" className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-['Inter']">
                Mot de passe oublié ?
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-[#f8fafc] font-['Inter'] font-bold transition-all shadow-lg shadow-[#3b82f6]/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
