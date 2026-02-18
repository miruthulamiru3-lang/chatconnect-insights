import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  getCallSignal, answerCall, endCall, rejectCall,
  getUserById, type CallSignal, type User
} from "@/lib/store";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Monitor } from "lucide-react";

interface CallScreenProps {
  currentUser: User;
  onClose: () => void;
}

const CallScreen = ({ currentUser, onClose }: CallScreenProps) => {
  const [signal, setSignal] = useState<CallSignal | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isIncoming = signal?.receiverId === currentUser.id && signal?.status === 'ringing';
  const isActive = signal?.status === 'answered';
  const isOutgoing = signal?.callerId === currentUser.id && signal?.status === 'ringing';

  const otherUserId = signal?.callerId === currentUser.id ? signal?.receiverId : signal?.callerId;
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  useEffect(() => {
    const poll = setInterval(() => {
      const s = getCallSignal();
      setSignal(s);
      if (!s) {
        onClose();
      }
    }, 500);
    return () => clearInterval(poll);
  }, [onClose]);

  useEffect(() => {
    if (isActive || isOutgoing) {
      startMedia();
    }
    return () => {
      stopMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isOutgoing]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const startMedia = async () => {
    try {
      const isVideo = signal?.type === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.log("Media access denied:", err);
    }
  };

  const stopMedia = () => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
  };

  const handleAnswer = () => {
    answerCall();
  };

  const handleEnd = () => {
    stopMedia();
    endCall();
    onClose();
  };

  const handleReject = () => {
    rejectCall();
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!signal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[hsl(230,25%,8%)] via-[hsl(262,40%,15%)] to-[hsl(230,25%,8%)] flex flex-col items-center justify-center">
      {/* Video area */}
      {signal.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Simulated remote video - gradient placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(262,30%,20%)] to-[hsl(230,25%,12%)] flex items-center justify-center">
            <div className="text-center">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl font-bold text-white mx-auto mb-4">
                {otherUser?.name[0] || '?'}
              </div>
              {!isActive && (
                <p className="text-white/60 text-lg animate-pulse">
                  {isIncoming ? 'Incoming video call...' : 'Calling...'}
                </p>
              )}
            </div>
          </div>
          {/* Local video preview */}
          {localStream && !isVideoOff && (
            <div className="absolute bottom-28 right-6 w-40 h-28 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Audio call UI */}
      {signal.type === 'audio' && (
        <div className="text-center z-10">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl shadow-primary/30">
            {otherUser?.name[0] || '?'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{otherUser?.name || 'Unknown'}</h2>
          <p className="text-white/50 text-sm mb-2">
            {isIncoming ? 'Incoming call...' : isActive ? 'On call' : 'Calling...'}
          </p>
          {isActive && (
            <p className="text-white/70 text-lg font-mono">{formatDuration(callDuration)}</p>
          )}
        </div>
      )}

      {/* Video call overlay info */}
      {signal.type === 'video' && isActive && (
        <div className="absolute top-6 left-6 z-10">
          <p className="text-white font-semibold">{otherUser?.name}</p>
          <p className="text-white/60 text-sm font-mono">{formatDuration(callDuration)}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-12 z-10 flex items-center gap-4">
        {isIncoming ? (
          <>
            <Button
              onClick={handleReject}
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/80 shadow-lg shadow-destructive/30"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={handleAnswer}
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
            >
              {signal.type === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={toggleMute}
              className={`h-14 w-14 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'} hover:bg-white/20`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            {signal.type === 'video' && (
              <Button
                variant="ghost"
                onClick={toggleVideo}
                className={`h-14 w-14 rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'} hover:bg-white/20`}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            <Button
              onClick={handleEnd}
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/80 shadow-lg shadow-destructive/30"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallScreen;
