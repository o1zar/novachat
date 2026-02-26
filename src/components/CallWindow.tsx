import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface CallWindowProps {
  type: 'audio' | 'video';
  partner: User | { id: string; username: string; display_name?: string; avatar_url?: string };
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function CallWindow({ 
  type, 
  partner, 
  isIncoming, 
  onAccept, 
  onReject, 
  onHangup,
  localStream,
  remoteStream
}: CallWindowProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isIncoming) {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isIncoming]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && type === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
    >
      <div className="w-full max-w-4xl aspect-video bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative flex flex-col">
        
        {/* Remote Video (Main) */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {type === 'video' && remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#9b6bff] to-[#f06bff] flex items-center justify-center text-white text-5xl font-bold nova-glow animate-pulse">
                {partner.avatar_url ? (
                  <img src={partner.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (partner.display_name || partner.username)[0].toUpperCase()
                )}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{partner.display_name || partner.username}</h2>
                <p className="text-white/60 font-medium tracking-widest uppercase text-xs">
                  {isIncoming ? 'Incoming Call...' : formatDuration(callDuration)}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (PIP) */}
          {type === 'video' && localStream && (
            <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-[#2a2a2a] rounded-2xl border border-white/20 overflow-hidden shadow-xl z-10">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="h-24 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-4 md:gap-8 px-6">
          {isIncoming ? (
            <>
              <button 
                onClick={onReject}
                className="w-14 h-14 rounded-full bg-[#f04060] hover:bg-[#d03050] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-[#f04060]/20"
              >
                <PhoneOff size={24} />
              </button>
              <button 
                onClick={onAccept}
                className="w-14 h-14 rounded-full bg-[#3ef0a0] hover:bg-[#2ed090] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-[#3ef0a0]/20"
              >
                <Phone size={24} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={toggleMute}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105",
                  isMuted ? "bg-[#f04060] text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {type === 'video' && (
                <button 
                  onClick={toggleVideo}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105",
                    isVideoOff ? "bg-[#f04060] text-white" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              <button 
                onClick={onHangup}
                className="w-14 h-14 rounded-full bg-[#f04060] hover:bg-[#d03050] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-[#f04060]/40"
              >
                <PhoneOff size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
