import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { MessageSquare, User as UserIcon, Lock, ArrowRight, Shield, Zap, Globe } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('nova_user', JSON.stringify(data));
        onLogin(data);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090e] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[660px] flex flex-col md:flex-row bg-[#10101a] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_60px_160px_rgba(0,0,0,0.8)] relative z-10"
      >
        {/* Left Side - Form */}
        <div className="flex-1 p-10 md:p-12 border-r border-white/5">
          <div className="flex items-center gap-3 mb-9">
            <div className="w-11 h-11 bg-gradient-to-br from-[#9b6bff] to-[#f06bff] rounded-xl flex items-center justify-center text-white nova-glow">
              <MessageSquare size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display tracking-wider nova-gradient-text uppercase">NOVA</h1>
              <p className="text-[10px] text-[#9090b8] font-medium uppercase tracking-widest -mt-1">Messenger</p>
            </div>
          </div>

          <div className="flex bg-[#171723] rounded-xl p-1 gap-1 mb-7">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${isLogin ? 'bg-[#21213a] text-white' : 'text-[#9090b8] hover:text-white'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!isLogin ? 'bg-[#21213a] text-white' : 'text-[#9090b8] hover:text-white'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#9090b8] uppercase tracking-widest ml-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555577]" size={16} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#171723] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#9b6bff] focus:ring-4 focus:ring-[#9b6bff]/10 transition-all placeholder:text-[#555577]"
                  placeholder="your_login"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#9090b8] uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555577]" size={16} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#171723] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#9b6bff] focus:ring-4 focus:ring-[#9b6bff]/10 transition-all placeholder:text-[#555577]"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-[#f04060] text-xs font-medium text-center py-2">
                {error}
              </p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-br from-[#9b6bff] to-[#f06bff] hover:scale-[1.02] active:scale-[0.98] text-white font-bold font-display text-sm tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(155,107,255,0.4)] disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>
        </div>

        {/* Right Side - Info */}
        <div className="hidden md:flex w-[320px] p-12 bg-[#09090e] flex-col justify-center gap-6">
          <div>
            <h2 className="text-xl font-extrabold font-display mb-1">Welcome to NOVA ✨</h2>
            <p className="text-xs text-[#9090b8] leading-relaxed">Connect, call, and share — all in one place with real-time speed.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-[#10101a] rounded-xl border border-white/5">
              <div className="text-xl">💬</div>
              <div>
                <strong className="block text-xs text-white">Real-time</strong>
                <span className="text-[10px] text-[#9090b8]">Instant messages via WebSocket</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-[#10101a] rounded-xl border border-white/5">
              <div className="text-xl">📞</div>
              <div>
                <strong className="block text-xs text-white">Calls</strong>
                <span className="text-[10px] text-[#9090b8]">Voice & video via WebRTC</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-[#10101a] rounded-xl border border-white/5">
              <div className="text-xl">🔒</div>
              <div>
                <strong className="block text-xs text-white">Private</strong>
                <span className="text-[10px] text-[#9090b8]">Secure direct messaging</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
