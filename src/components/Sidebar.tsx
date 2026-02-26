import React, { useState, useEffect } from 'react';
import { Chat, User } from '../types';
import { MessageSquare, Search, Plus, Hash, Globe, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeChat: Chat;
  onSelectChat: (chat: Chat) => void;
  knownChats: Chat[];
  currentUser: User;
}

export function Sidebar({ activeChat, onSelectChat, knownChats, currentUser }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [tab, setTab] = useState<'all' | 'dm' | 'groups'>('all');

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setAllUsers(data.filter((u: User) => u.id !== currentUser.id)));
  }, [currentUser.id]);

  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartChat = (user: User) => {
    onSelectChat({ 
      id: user.id, 
      username: user.username, 
      display_name: user.display_name, 
      avatar_url: user.avatar_url, 
      type: 'direct',
      is_developer: user.is_developer
    });
    setShowUserSearch(false);
    setSearchTerm('');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDesc,
          userId: currentUser.id
        })
      });
      const group = await res.json();
      onSelectChat({
        id: group.id,
        username: group.name,
        display_name: group.name,
        type: 'group',
        description: group.description
      });
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDesc('');
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const dms = knownChats.filter(c => 
    c.type === 'direct' && 
    (c.display_name || c.username).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const groups = knownChats.filter(c => 
    c.type === 'group' && 
    (c.display_name || c.username).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const isGlobalMatch = searchTerm === '' || 'global chat'.includes(searchTerm.toLowerCase());

  // Global search for users not in knownChats
  const globalUserMatches = allUsers.filter(u => 
    !knownChats.some(c => c.id === u.id) &&
    (u.display_name || u.username).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-[290px] min-w-[290px] bg-[var(--bg2)] border-r border-[var(--border)] flex flex-col shrink-0 font-sans">
      <div className="p-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[#9b6bff] to-[#f06bff] rounded-lg flex items-center justify-center text-white nova-glow">
            <MessageSquare size={15} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold font-display text-lg tracking-wider nova-gradient-text uppercase leading-none">NOVA</h1>
            <span className="text-[8px] font-bold text-[#9b6bff] tracking-widest uppercase opacity-80">nova.cx.ua</span>
          </div>
        </div>
        <button 
          onClick={() => setShowUserSearch(!showUserSearch)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showUserSearch ? 'bg-[#9b6bff]/20 text-[#9b6bff]' : 'bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] border border-[var(--border)]'}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="px-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text2)]" size={13} />
          <input 
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 bg-[var(--bg3)] border border-[var(--border)] rounded-lg pl-9 pr-4 text-xs text-[var(--text)] outline-none focus:border-[#9b6bff]/40 transition-all placeholder:text-[var(--text2)]"
          />
        </div>
      </div>

      <div className="flex px-3 gap-1 mb-3">
        {(['all', 'dm', 'groups'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-7 rounded-md text-[11px] font-medium transition-all capitalize ${tab === t ? 'bg-[var(--bg4)] text-[var(--text)] border border-[var(--border)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pb-4 scrollbar-hide">
        {showUserSearch ? (
          <div className="space-y-1">
            <p className="px-3 text-[9.5px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-2 mt-2">New Conversation</p>
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg3)] transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--bg3)] flex items-center justify-center text-[var(--text2)] font-bold group-hover:bg-[#9b6bff]/20 group-hover:text-[#9b6bff] transition-all overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (user.display_name || user.username)[0].toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text)]">{user.display_name || user.username}</span>
                    {user.is_developer && (
                      <span className="px-1 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[7px] font-bold rounded uppercase tracking-wider">Dev</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", user.is_online ? "bg-[#3ef0a0]" : "bg-[var(--text2)]")} />
                    <span className={cn("text-[10px]", user.is_online ? "text-[#3ef0a0]" : "text-[var(--text2)]")}>
                      {user.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {isGlobalMatch && (
              <div>
                <p className="px-3 text-[9.5px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-1.5">Channels</p>
                <button
                  onClick={() => onSelectChat({ id: 'global', username: 'Global Chat', type: 'global' })}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left relative group",
                    activeChat.id === 'global' 
                      ? "bg-gradient-to-r from-[#9b6bff]/15 to-[#f06bff]/10 border border-[#9b6bff]/20" 
                      : "hover:bg-[var(--bg3)] text-[var(--text2)]"
                  )}
                >
                  {activeChat.id === 'global' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-gradient-to-b from-[#9b6bff] to-[#f06bff] rounded-r-full" />
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    activeChat.id === 'global' ? "bg-gradient-to-br from-[#9b6bff] to-[#f06bff] text-white" : "bg-[var(--bg3)] text-[var(--text2)]"
                  )}>
                    <Globe size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={cn("text-[13px] font-semibold truncate", activeChat.id === 'global' ? "text-[var(--text)]" : "text-[var(--text)]")}>Global Chat</p>
                    <p className="text-[11px] text-[var(--text2)] truncate">Public messages</p>
                  </div>
                </button>
              </div>
            )}

            {groups.length > 0 && (
              <div>
                <div className="px-3 flex items-center justify-between mb-1.5">
                  <p className="text-[9.5px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">Groups</p>
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="text-[var(--text2)] hover:text-[#9b6bff] transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-1">
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => onSelectChat(group)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left relative group",
                        activeChat.id === group.id 
                          ? "bg-gradient-to-r from-[#9b6bff]/15 to-[#f06bff]/10 border border-[#9b6bff]/20" 
                          : "hover:bg-[var(--bg3)] text-[var(--text2)]"
                      )}
                    >
                      {activeChat.id === group.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-gradient-to-b from-[#9b6bff] to-[#f06bff] rounded-r-full" />
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all overflow-hidden",
                        activeChat.id === group.id ? "bg-gradient-to-br from-[#9b6bff] to-[#f06bff] text-white" : "bg-[var(--bg3)] text-[var(--text2)]"
                      )}>
                        {group.avatar_url ? (
                          <img src={group.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={18} />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={cn("text-[13px] font-semibold truncate", activeChat.id === group.id ? "text-[var(--text)]" : "text-[var(--text)]")}>{group.display_name || group.username}</p>
                        <p className="text-[11px] text-[var(--text2)] truncate">{group.description || 'No description'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dms.length > 0 && (
              <div>
                <p className="px-3 text-[9.5px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-1.5">Direct Messages</p>
                <div className="space-y-1">
                  {dms.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left relative group",
                        activeChat.id === chat.id 
                          ? "bg-gradient-to-r from-[#9b6bff]/15 to-[#f06bff]/10 border border-[#9b6bff]/20" 
                          : "hover:bg-[var(--bg3)] text-[var(--text2)]"
                      )}
                    >
                      {activeChat.id === chat.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-gradient-to-b from-[#9b6bff] to-[#f06bff] rounded-r-full" />
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all overflow-hidden",
                        activeChat.id === chat.id ? "bg-gradient-to-br from-[#9b6bff] to-[#f06bff] text-white" : "bg-[var(--bg3)] text-[var(--text2)]"
                      )}>
                        {chat.avatar_url ? (
                          <img src={chat.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (chat.display_name || chat.username)[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-[13px] font-semibold truncate", activeChat.id === chat.id ? "text-[var(--text)]" : "text-[var(--text)]")}>{chat.display_name || chat.username}</p>
                          {chat.is_developer && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#9b6bff]" title="Developer" />
                          )}
                        </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", chat.is_online ? "bg-[#3ef0a0]" : "bg-[var(--text2)]")} />
                        <p className="text-[11px] text-[var(--text2)] truncate">{chat.is_online ? 'Online' : 'Offline'}</p>
                      </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchTerm !== '' && globalUserMatches.length > 0 && (
              <div>
                <p className="px-3 text-[9.5px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-1.5">Global Search</p>
                <div className="space-y-1">
                  {globalUserMatches.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg3)] transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg3)] flex items-center justify-center text-[var(--text2)] font-bold group-hover:bg-[#9b6bff]/20 group-hover:text-[#9b6bff] transition-all overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user.display_name || user.username)[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text)]">{user.display_name || user.username}</span>
                          {user.is_developer && (
                            <span className="px-1 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[7px] font-bold rounded uppercase tracking-wider">Dev</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", user.is_online ? "bg-[#3ef0a0]" : "bg-[var(--text2)]")} />
                          <span className={cn("text-[10px]", user.is_online ? "text-[#3ef0a0]" : "text-[var(--text2)]")}>
                            {user.is_online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-[var(--border)] bg-[var(--bg2)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#9b6bff] to-[#f06bff] rounded-xl flex items-center justify-center text-white font-bold text-xs nova-glow shrink-0 overflow-hidden">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (currentUser.display_name || currentUser.username)[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p className="text-[12.5px] font-semibold text-[var(--text)] truncate">{currentUser.display_name || currentUser.username}</p>
              {currentUser.is_developer && (
                <span className="px-1 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[7px] font-bold rounded uppercase tracking-wider">Dev</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ef0a0] animate-pulse" />
              <p className="text-[10px] text-[#3ef0a0] font-medium uppercase tracking-wider">Online</p>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg2)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/50">
                <h2 className="text-lg font-bold text-[var(--text)] font-display">Create New Group</h2>
                <button onClick={() => setShowCreateGroup(false)} className="text-[var(--text2)] hover:text-[var(--text)]">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1.5">Group Name</label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#9b6bff] transition-all"
                    placeholder="e.g. Project Alpha"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1.5">Description</label>
                  <textarea 
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#9b6bff] transition-all resize-none h-24"
                    placeholder="What is this group about?"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#9b6bff] to-[#f06bff] text-white font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create Group
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
