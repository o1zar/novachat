import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Shield, Info, Send, Trash2, Moon, Bell, Eye, Lock, User as UserIcon, Camera, Check } from 'lucide-react';
import { User } from '../types';

interface SettingsProps {
  onClose: () => void;
  onReset: () => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export function Settings({ onClose, onReset, theme, setTheme, currentUser, onUpdateUser }: SettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [displayName, setDisplayName] = useState(currentUser.display_name || currentUser.username);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(false);

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          bio: bio
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        onUpdateUser(updatedUser);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[var(--bg2)] rounded-[24px] border border-[var(--border)] shadow-[0_40px_100px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold font-display text-[var(--text)]">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--border)] rounded-full transition-colors text-[var(--text2)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto scrollbar-hide">
          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">Profile Customization</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={32} className="text-[var(--text2)]" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text2)] uppercase tracking-wider ml-1">Nickname (Display Name)</label>
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter nickname..."
                      className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm text-[var(--text)] outline-none focus:border-[#9b6bff] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text2)] uppercase tracking-wider ml-1">Avatar URL</label>
                <input 
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm text-[var(--text)] outline-none focus:border-[#9b6bff] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text2)] uppercase tracking-wider ml-1">Bio</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={2}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl py-2 px-3 text-sm text-[var(--text)] outline-none focus:border-[#9b6bff] transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 bg-[#9b6bff] hover:bg-[#8a5ae6] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : updateSuccess ? <><Check size={16} /> Saved!</> : 'Save Profile'}
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">Appearance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg3)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#9b6bff]/10 rounded-xl flex items-center justify-center text-[#9b6bff]">
                    <Moon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                    <p className="text-[11px] text-[var(--text2)]">Adjust the visual theme</p>
                  </div>
                </div>
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-[#9b6bff]' : 'bg-[var(--bg5)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg3)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f0c060]/10 rounded-xl flex items-center justify-center text-[#f0c060]">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">Push Notifications</p>
                    <p className="text-[11px] text-[var(--text2)]">Get alerts for new messages</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[#9b6bff]' : 'bg-[var(--bg5)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">Privacy & Security</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg3)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#3ef0a0]/10 rounded-xl flex items-center justify-center text-[#3ef0a0]">
                    <Eye size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">Read Receipts</p>
                    <p className="text-[11px] text-[var(--text2)]">Show when you've read messages</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReadReceipts(!readReceipts)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${readReceipts ? 'bg-[#9b6bff]' : 'bg-[var(--bg5)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${readReceipts ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#9b6bff]/10 border border-[#9b6bff]/20 text-[#9b6bff]">
                <Lock size={20} />
                <p className="text-[11px] font-medium">Your chats are stored securely in our local database.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to reset all data and logout?')) {
                    onReset();
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#f04060]/20 bg-[#f04060]/5 hover:bg-[#f04060]/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f04060]/10 rounded-xl flex items-center justify-center text-[#f04060]">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#f04060]">Reset to Default</p>
                    <p className="text-[11px] text-[#f04060]/60">Clear session and logout</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest mb-4">About Project</h3>
            <div className="bg-[var(--bg3)] rounded-2xl p-6 space-y-4 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#9b6bff]/10 rounded-xl flex items-center justify-center text-[#9b6bff] shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <p className="font-bold font-display text-[var(--text)]">NOVA Messenger v1.0</p>
                  <p className="text-[12px] text-[var(--text2)] leading-relaxed mt-1">
                    A real-time communication platform built with modern technologies. 
                    Designed for speed, security, and simplicity.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
                <a 
                  href="https://olzar000.t.me" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg5)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text)] hover:border-[#9b6bff] hover:text-[#9b6bff] transition-all"
                >
                  <Send size={14} />
                  Telegram
                </a>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-[var(--bg2)] border-t border-[var(--border)] text-center shrink-0">
          <p className="text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest">
            Crafted with passion • 2026
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
