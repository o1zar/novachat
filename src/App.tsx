import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Chat, ChatType } from './types';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings';
import { CallWindow } from './components/CallWindow';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, LogOut, Phone, Video, Info, Hash } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeChat, setActiveChat] = useState<Chat>({ id: 'global', username: 'Global Chat', type: 'global' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [knownChats, setKnownChats] = useState<Chat[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const socket = useRef<WebSocket | null>(null);

  // WebRTC State
  const [activeCall, setActiveCall] = useState<{
    type: 'audio' | 'video';
    partner: User | { id: string; username: string; display_name?: string; avatar_url?: string };
    isIncoming: boolean;
  } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const setupPeerConnection = (targetId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.send(JSON.stringify({
          type: 'ice_candidate',
          targetId,
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async (type: 'audio' | 'video', partner: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);
      setActiveCall({ type, partner, isIncoming: false });

      const pc = setupPeerConnection(partner.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.current?.send(JSON.stringify({
        type: 'call_request',
        targetId: partner.id,
        callType: type,
        offer
      }));
    } catch (err) {
      console.error('Failed to start call', err);
      alert('Could not access camera/microphone');
    }
  };

  const handleHangup = () => {
    if (activeCall && socket.current) {
      socket.current.send(JSON.stringify({
        type: 'hangup',
        targetId: activeCall.partner.id
      }));
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    peerConnection.current?.close();
    peerConnection.current = null;
    setActiveCall(null);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('nova_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const savedTheme = localStorage.getItem('nova_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nova_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      socket.current?.send(JSON.stringify({ type: 'auth', userId: user.id }));
    };

    socket.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_global_message') {
        if (activeChat.type === 'global') {
          setMessages(prev => [...prev, data.message]);
        }
      } else if (data.type === 'new_direct_message') {
        const msg = data.message;
        if (activeChat.type === 'direct' && (msg.sender_id === activeChat.id || msg.receiver_id === activeChat.id)) {
          setMessages(prev => [...prev, msg]);
        }
        
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const partnerName = msg.sender_id === user.id ? activeChat.username : msg.sender_name;
        
        setKnownChats(prev => {
          if (prev.some(c => c.id === partnerId)) return prev;
          return [...prev, { id: partnerId, username: partnerName, type: 'direct', is_developer: msg.sender_is_dev }];
        });
      } else if (data.type === 'new_group_message') {
        const msg = data.message;
        if (activeChat.type === 'group' && msg.group_id === activeChat.id) {
          setMessages(prev => [...prev, msg]);
        }
      } else if (data.type === 'dev_status_updated') {
        setUser(prev => {
          const updatedUser = prev ? { ...prev, is_developer: data.isDeveloper } : null;
          if (updatedUser) localStorage.setItem('nova_user', JSON.stringify(updatedUser));
          return updatedUser;
        });
      } else if (data.type === 'user_updated') {
        setOnlineUsers(prev => prev.map(u => u.id === data.userId ? { ...u, is_developer: data.isDeveloper } : u));
        setKnownChats(prev => prev.map(c => c.id === data.userId ? { ...c, is_developer: data.isDeveloper } : c));
        if (activeChat.id === data.userId) {
          setActiveChat(prev => ({ ...prev, is_developer: data.isDeveloper }));
        }
      } else if (data.type === 'user_presence') {
        setOnlineUsers(prev => prev.map(u => u.id === data.userId ? { ...u, is_online: data.status === 'online' } : u));
        setKnownChats(prev => prev.map(c => c.id === data.userId ? { ...c, is_online: data.status === 'online' } : c));
        if (activeChat.id === data.userId) {
          setActiveChat(prev => ({ ...prev, is_online: data.status === 'online' }));
        }
      } else if (data.type === 'call_request') {
        setActiveCall({
          type: data.callType,
          partner: { id: data.senderId, username: data.senderName || 'Unknown' },
          isIncoming: true
        });
        // Store offer for later
        (window as any)._pendingOffer = data.offer;
      } else if (data.type === 'call_response') {
        if (data.accepted) {
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else {
          cleanupCall();
          alert('Call rejected');
        }
      } else if (data.type === 'ice_candidate') {
        await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else if (data.type === 'hangup') {
        cleanupCall();
      }
    };

    fetch(`/api/chats/${user.id}`)
      .then(res => res.json())
      .then(data => {
        const chats = data.map((u: any) => ({ 
          id: u.id, 
          username: u.username, 
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          type: 'direct',
          is_developer: u.is_developer,
          is_online: u.is_online
        }));
        setKnownChats(prev => {
          const filtered = prev.filter(c => c.type === 'group');
          return [...filtered, ...chats];
        });
      });

    fetch(`/api/groups/${user.id}`)
      .then(res => res.json())
      .then(data => {
        const groups = data.map((g: any) => ({
          id: g.id,
          username: g.name,
          display_name: g.name,
          avatar_url: g.avatar_url,
          type: 'group',
          description: g.description
        }));
        setKnownChats(prev => {
          const filtered = prev.filter(c => c.type !== 'group');
          return [...filtered, ...groups];
        });
      });

    fetch('/api/users')
      .then(res => res.json())
      .then(data => setOnlineUsers(data.filter((u: User) => u.id !== user.id)));

    return () => {
      socket.current?.close();
    };
  }, [user, activeChat.id, activeChat.type]);

  useEffect(() => {
    if (!user) return;
    
    let endpoint = '';
    if (activeChat.type === 'global') {
      endpoint = '/api/messages/global';
    } else if (activeChat.type === 'direct') {
      endpoint = `/api/messages/direct/${user.id}/${activeChat.id}`;
    } else if (activeChat.type === 'group') {
      endpoint = `/api/messages/group/${activeChat.id}`;
    }
    
    fetch(endpoint)
      .then(res => res.json())
      .then(data => setMessages(data));
  }, [activeChat, user]);

  const handleSendMessage = (content: string, msgType: 'text' | 'file' | 'voice' = 'text', fileName?: string, fileSize?: number) => {
    if (!socket.current || !user) return;

    let type = 'global_message';
    if (activeChat.type === 'direct') type = 'direct_message';
    if (activeChat.type === 'group') type = 'group_message';

    const payload: any = { 
      type, 
      content, 
      msgType, 
      fileName, 
      fileSize 
    };

    if (activeChat.type === 'direct') {
      payload.receiverId = activeChat.id;
    } else if (activeChat.type === 'group') {
      payload.groupId = activeChat.id;
    }

    socket.current.send(JSON.stringify(payload));
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_user');
    setUser(null);
    setMessages([]);
    setKnownChats([]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('nova_user', JSON.stringify(updatedUser));
  };

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg)] overflow-hidden font-sans items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[1200px] h-full max-h-[760px] flex bg-[var(--bg)] rounded-none md:rounded-[22px] overflow-hidden border border-[var(--border)] shadow-[0_40px_120px_rgba(0,0,0,0.85)] relative z-10"
      >
        <Sidebar 
          activeChat={activeChat} 
          onSelectChat={setActiveChat} 
          knownChats={knownChats}
          currentUser={user}
        />
        
        <main className="flex-1 flex flex-col relative min-w-0 bg-[var(--bg)]">
          <header className="h-[62px] border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-[38px] h-[38px] rounded-xl flex items-center justify-center text-white font-bold text-sm font-display overflow-hidden",
                activeChat.type === 'global' ? "bg-gradient-to-br from-[#9b6bff] to-[#f06bff]" : "bg-[var(--bg3)] border border-[var(--border)]"
              )}>
                {activeChat.type === 'global' ? (
                  <Hash size={18} />
                ) : activeChat.avatar_url ? (
                  <img src={activeChat.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (activeChat.display_name || activeChat.username)[0].toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold font-display text-[14.5px] text-[var(--text)]">{activeChat.display_name || activeChat.username}</h2>
                  {activeChat.is_developer && (
                    <span className="px-1.5 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[9px] font-bold rounded uppercase tracking-wider">Developer</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", activeChat.type === 'global' ? "bg-[#9b6bff]" : (activeChat.is_online ? "bg-[#3ef0a0]" : "bg-[var(--text2)]"))} />
                  <p className={cn("text-[11px] font-medium", activeChat.type === 'global' ? "text-[var(--text2)]" : (activeChat.is_online ? "text-[#3ef0a0]" : "text-[var(--text2)]"))}>
                    {activeChat.type === 'global' ? 'Public Channel' : (activeChat.is_online ? 'Online' : 'Offline')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeChat.type === 'direct' && (
                <>
                  <button 
                    onClick={() => startCall('audio', activeChat)}
                    className="w-[34px] h-[34px] rounded-lg bg-[#3ef0a0]/10 border border-[#3ef0a0]/20 flex items-center justify-center text-[#3ef0a0] hover:bg-[#3ef0a0]/20 transition-all"
                  >
                    <Phone size={15} />
                  </button>
                  <button 
                    onClick={() => startCall('video', activeChat)}
                    className="w-[34px] h-[34px] rounded-lg bg-[#9b6bff]/10 border border-[#9b6bff]/20 flex items-center justify-center text-[#9b6bff] hover:bg-[#9b6bff]/20 transition-all"
                  >
                    <Video size={15} />
                  </button>
                </>
              )}
              <button 
                onClick={() => setShowSettings(true)}
                className="w-[34px] h-[34px] rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text2)] hover:text-[var(--text)] transition-all"
              >
                <SettingsIcon size={15} />
              </button>
              <button 
                onClick={handleLogout}
                className="w-[34px] h-[34px] rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text2)] hover:text-[#f04060] hover:border-[#f04060]/30 transition-all"
              >
                <LogOut size={15} />
              </button>
            </div>
          </header>

          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            currentUser={user}
          />

          <AnimatePresence>
            {showSettings && (
              <Settings 
                onClose={() => setShowSettings(false)} 
                onReset={handleLogout}
                theme={theme}
                setTheme={setTheme}
                currentUser={user}
                onUpdateUser={handleUpdateUser}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeCall && (
              <CallWindow 
                type={activeCall.type}
                partner={activeCall.partner}
                isIncoming={activeCall.isIncoming}
                localStream={localStream}
                remoteStream={remoteStream}
                onHangup={handleHangup}
                onReject={() => {
                  socket.current?.send(JSON.stringify({
                    type: 'call_response',
                    targetId: activeCall.partner.id,
                    accepted: false
                  }));
                  cleanupCall();
                }}
                onAccept={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                      audio: true,
                      video: activeCall.type === 'video'
                    });
                    setLocalStream(stream);
                    setActiveCall(prev => prev ? { ...prev, isIncoming: false } : null);

                    const pc = setupPeerConnection(activeCall.partner.id);
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));

                    const offer = (window as any)._pendingOffer;
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.current?.send(JSON.stringify({
                      type: 'call_response',
                      targetId: activeCall.partner.id,
                      accepted: true,
                      answer
                    }));
                  } catch (err) {
                    console.error('Failed to accept call', err);
                    cleanupCall();
                  }
                }}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Right Panel */}
        <aside className="hidden lg:flex w-[230px] min-w-[230px] bg-[var(--bg2)] border-l border-[var(--border)] flex-col p-[18px] gap-[18px] overflow-y-auto scrollbar-hide">
          <div>
            <p className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-[0.08em] mb-3">Profile</p>
            <div className="p-5 bg-[var(--bg3)] rounded-2xl border border-[var(--border)] text-center">
              <div className={cn(
                "w-14 h-14 rounded-[17px] mx-auto mb-2.5 flex items-center justify-center text-white font-extrabold text-xl font-display nova-glow overflow-hidden",
                activeChat.type === 'global' ? "bg-gradient-to-br from-[#9b6bff] to-[#f06bff]" : "bg-[var(--bg5)]"
              )}>
                {activeChat.type === 'global' ? (
                  <Hash size={24} />
                ) : activeChat.avatar_url ? (
                  <img src={activeChat.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (activeChat.display_name || activeChat.username)[0].toUpperCase()
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 mb-1">
                <h3 className="font-bold font-display text-[14.5px] text-[var(--text)]">{activeChat.display_name || activeChat.username}</h3>
                {activeChat.is_developer && (
                  <span className="px-1.5 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[8px] font-bold rounded uppercase tracking-wider">Developer</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text2)] mb-1">@{activeChat.username.toLowerCase().replace(' ', '_')}</p>
              <p className="text-[11.5px] text-[var(--text2)] italic mb-2.5">
                {activeChat.type === 'global' ? '"Connecting the world with NOVA."' : (onlineUsers.find(u => u.id === activeChat.id)?.bio || 'No bio yet.')}
              </p>
              <div className="flex justify-center gap-4 pt-2.5 border-t border-[var(--border)]">
                <div>
                  <p className="font-bold font-display text-[15px] text-[var(--text)]">{messages.length}</p>
                  <p className="text-[9.5px] text-[var(--text2)] uppercase tracking-wider">Messages</p>
                </div>
                <div>
                  <p className="font-bold font-display text-[15px] text-[var(--text)]">{onlineUsers.length}</p>
                  <p className="text-[9.5px] text-[var(--text2)] uppercase tracking-wider">Contacts</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-[0.08em] mb-3">Online Now</p>
            <div className="space-y-1.5">
              {onlineUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setActiveChat({ id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, type: 'direct', is_developer: u.is_developer })}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--bg3)] transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg5)] flex items-center justify-center text-[var(--text)] font-bold text-[10px] font-display group-hover:bg-[#9b6bff]/20 group-hover:text-[#9b6bff] transition-all overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (u.display_name || u.username)[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-medium text-[var(--text)] truncate">{u.display_name || u.username}</p>
                      {u.is_developer && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#9b6bff]" title="Developer" />
                      )}
                    </div>
                    <p className={cn("text-[10px]", u.is_online ? "text-[#3ef0a0]" : "text-[var(--text2)]")}>
                      {u.is_online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              ))}
              {onlineUsers.length === 0 && (
                <p className="text-[11.5px] text-[var(--text2)] italic p-2">No users online</p>
              )}
            </div>
          </div>
        </aside>
      </motion.div>
    </div>
  );
}
