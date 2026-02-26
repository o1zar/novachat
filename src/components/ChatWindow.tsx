import React, { useState, useEffect, useRef } from 'react';
import { Message, User, MessageType } from '../types';
import { Send, Smile, Paperclip, MoreHorizontal, Phone, Video, Mic, Square, File as FileIcon, Download, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, type?: MessageType, fileName?: string, fileSize?: number) => void;
  currentUser: User;
}

export function ChatWindow({ messages, onSendMessage, currentUser }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onSendMessage(base64, 'file', file.name, file.size);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onSendMessage(base64, 'voice');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(recordingInterval.current);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden font-sans">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-1 scroll-smooth scrollbar-hide"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-[var(--bg3)] rounded-2xl border border-[var(--border)] flex items-center justify-center text-[#9b6bff] mb-4">
              <Smile size={32} />
            </div>
            <h3 className="text-[var(--text)] font-display font-bold text-lg mb-1">Welcome to NOVA</h3>
            <p className="text-[var(--text2)] text-sm max-w-xs">Start the conversation by sending a message below.</p>
          </div>
        )}

        <div className="text-center py-4 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--border)]" />
          <span className="relative z-10 bg-[var(--bg)] px-4 text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest">Today</span>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUser.id;
          const showSender = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={cn(
                "flex items-end gap-2 mb-0.5",
                isMe ? "flex-row-reverse" : "flex-row"
              )}
            >
              {!isMe && (
                <div className="w-7 h-7 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--text2)] shrink-0 font-display overflow-hidden">
                  {msg.sender_avatar_url ? (
                    <img src={msg.sender_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (msg.sender_display_name || msg.sender_name)[0].toUpperCase()
                  )}
                </div>
              )}
              
              <div className={cn(
                "flex flex-col max-w-[66%]",
                isMe ? "items-end" : "items-start"
              )}
              >
                {!isMe && showSender && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-[10.5px] font-bold text-[var(--text2)] uppercase tracking-widest">
                      {msg.sender_display_name || msg.sender_name}
                    </span>
                    {msg.sender_is_dev && (
                      <span className="px-1 py-0.5 bg-[#9b6bff]/20 text-[#9b6bff] text-[7px] font-bold rounded uppercase tracking-wider">Dev</span>
                    )}
                  </div>
                )}
                
                <div className={cn(
                  "px-3.5 py-2.5 rounded-[15px] text-[13.5px] leading-relaxed shadow-sm relative group",
                  isMe 
                    ? "bg-gradient-to-br from-[#6a4fcc] to-[#9b6bff]/80 text-white rounded-br-none shadow-[0_3px_16px_rgba(106,79,204,0.32)]" 
                    : "bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-bl-none"
                )}>
                  {msg.type === 'text' && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  
                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <FileIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{msg.file_name}</p>
                        <p className="text-[10px] opacity-70">{formatFileSize(msg.file_size)}</p>
                      </div>
                      <a 
                        href={msg.content} 
                        download={msg.file_name}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <div className="flex items-center gap-3 py-1 min-w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Play size={18} fill="currentColor" />
                      </div>
                      <div className="flex-1">
                        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-white/60" />
                        </div>
                        <p className="text-[10px] mt-1 opacity-70">Voice Message</p>
                      </div>
                      <audio src={msg.content} controls className="hidden" />
                    </div>
                  )}

                  <div className={cn(
                    "flex items-center gap-1 mt-1 opacity-50 text-[9.5px]",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    {formatTime(msg.timestamp)}
                    {isMe && <span>✓✓</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-5 bg-[var(--bg)]/85 backdrop-blur-xl border-t border-[var(--border)] shrink-0 relative">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-5 mb-4 z-50"
            >
              <EmojiPicker 
                theme={EmojiTheme.DARK}
                onEmojiClick={(emojiData) => {
                  setInput(prev => prev + emojiData.emoji);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mb-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-lg bg-transparent border border-[var(--border)] flex items-center justify-center text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] transition-all"
          >
            <Paperclip size={12} />
          </button>
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "w-7 h-7 rounded-lg bg-transparent border border-[var(--border)] flex items-center justify-center text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] transition-all",
              showEmojiPicker && "bg-[var(--bg3)] text-[#9b6bff] border-[#9b6bff]/30"
            )}
          >
            <Smile size={12} />
          </button>
          <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
          
          {isRecording && (
            <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Recording {formatRecordingTime(recordingTime)}</span>
            </div>
          )}
        </div>

        <form 
          onSubmit={handleSend}
          className="flex items-end gap-2"
        >
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-[var(--bg3)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-[13.5px] text-[var(--text)] outline-none focus:border-[#9b6bff] focus:ring-2 focus:ring-[#9b6bff]/10 transition-all placeholder:text-[var(--text2)] resize-none min-h-[42px] max-h-[100px]"
          />
          
          {!input.trim() ? (
            <button 
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg",
                isRecording 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-[var(--bg3)] border border-[var(--border)] text-[var(--text2)] hover:text-[#9b6bff] hover:border-[#9b6bff]/30"
              )}
            >
              {isRecording ? <Square size={17} fill="currentColor" /> : <Mic size={17} />}
            </button>
          ) : (
            <button 
              type="submit"
              className="w-[42px] h-[42px] bg-gradient-to-br from-[#6a4fcc] to-[#f06bff] hover:scale-105 active:scale-95 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-[0_4px_16px_rgba(106,79,204,0.4)]"
            >
              <Send size={17} strokeWidth={2.5} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
