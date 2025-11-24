import { useState, useRef, useCallback, useEffect } from 'react';
import { WebRTCStream } from '@/utils/webrtc-stream';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UseWebRTCStreamOptions {
  streamId: string;
  isBroadcaster: boolean;
  onViewerCountChange?: (count: number) => void;
}

export const useWebRTCStream = ({ 
  streamId, 
  isBroadcaster,
  onViewerCountChange 
}: UseWebRTCStreamOptions) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const webrtcRef = useRef<WebRTCStream | null>(null);
  const channelRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Initialize WebRTC - OPTIMIZED with join-request system
  const initialize = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!user || initAttemptedRef.current || isConnecting) {
      console.log('⏸️ [WebRTC] Skipping init:', { user: !!user, attempted: initAttemptedRef.current, connecting: isConnecting });
      return;
    }

    initAttemptedRef.current = true;
    console.log(`🚀 [WebRTC] Initializing as ${isBroadcaster ? 'BROADCASTER' : 'VIEWER'} - StreamID: ${streamId}, UserID: ${user.id}`);
    setIsConnecting(true);
    
    try {
      webrtcRef.current = new WebRTCStream();

      if (isBroadcaster) {
        console.log('📡 [WebRTC] Starting BROADCASTER mode...');
        
        await webrtcRef.current.initBroadcaster(videoElement);
        console.log('✅ [WebRTC] Broadcaster initialized with local stream');
        
        channelRef.current = supabase
          .channel(`live-stream-${streamId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: user.id }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const state = channelRef.current?.presenceState();
            const viewers = Object.keys(state || {}).filter((key: string) => key !== user.id).length;
            console.log('👥 [WebRTC] Active viewers:', viewers);
            setViewerCount(viewers);
            onViewerCountChange?.(viewers);
          })
          
          // === NEW: Listen for viewer join requests ===
          .on('broadcast', { event: 'viewer-join-request' }, async ({ payload }) => {
            console.log('📥 [WebRTC] Received join request from viewer:', payload.viewerId);
            
            try {
              const viewerPC = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                ],
              });

              // Add local tracks IMMEDIATELY
              const localStream = webrtcRef.current?.getLocalStream();
              if (localStream) {
                localStream.getTracks().forEach(track => {
                  console.log(`➕ [WebRTC] Adding ${track.kind} track for viewer ${payload.viewerId}`);
                  viewerPC.addTrack(track, localStream);
                });
              }

              viewerPC.onicecandidate = (event) => {
                if (event.candidate) {
                  console.log('🧊 [WebRTC] Sending ICE to viewer:', payload.viewerId);
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: {
                      candidate: event.candidate.toJSON(),
                      from: user.id,
                      to: payload.viewerId,
                    },
                  });
                }
              };

              viewerPC.onconnectionstatechange = () => {
                console.log(`🔗 [WebRTC] Viewer ${payload.viewerId} state:`, viewerPC.connectionState);
                if (viewerPC.connectionState === 'failed' || viewerPC.connectionState === 'closed') {
                  peerConnectionsRef.current.delete(payload.viewerId);
                }
              };

              await viewerPC.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await viewerPC.createAnswer();
              await viewerPC.setLocalDescription(answer);

              peerConnectionsRef.current.set(payload.viewerId, viewerPC);
              console.log(`✅ [WebRTC] Peer connection for viewer ${payload.viewerId} (total: ${peerConnectionsRef.current.size})`);
              
              console.log('📤 [WebRTC] Sending answer to viewer:', payload.viewerId);
              channelRef.current?.send({
                type: 'broadcast',
                event: 'broadcaster-answer',
                payload: {
                  answer: answer,
                  from: user.id,
                  to: payload.viewerId,
                },
              });
            } catch (error) {
              console.error('❌ [WebRTC] Error handling join request:', error);
            }
          })
          
          .on('broadcast', { event: 'viewer-answer' }, async ({ payload }) => {
            if (payload.to !== user.id) return;
            console.log('📥 [WebRTC] Received answer from viewer:', payload.from);
            const viewerPC = peerConnectionsRef.current.get(payload.from);
            if (viewerPC) {
              try {
                await viewerPC.setRemoteDescription(new RTCSessionDescription(payload.answer));
                console.log('✅ [WebRTC] Set remote description');
              } catch (error) {
                console.error('❌ [WebRTC] Error setting remote description:', error);
              }
            }
          })
          
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.to !== user.id) return;
            const viewerPC = peerConnectionsRef.current.get(payload.from);
            if (viewerPC && payload.candidate) {
              try {
                await viewerPC.addIceCandidate(new RTCIceCandidate(payload.candidate));
                console.log('✅ [WebRTC] ICE candidate added');
              } catch (error) {
                console.error('❌ [WebRTC] Error adding ICE:', error);
              }
            }
          })
          .subscribe(async (status) => {
            console.log('📡 [WebRTC] Broadcaster channel:', status);
            if (status === 'SUBSCRIBED') {
              await channelRef.current?.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
              });
              setIsConnected(true);
              setIsConnecting(false);
              console.log('✅ [WebRTC] Broadcaster ready');
            }
          });

      } else {
        // === VIEWER MODE ===
        console.log('📡 [WebRTC] Starting VIEWER mode...');
        
        await webrtcRef.current.initViewer(videoElement);
        console.log('✅ [WebRTC] Viewer initialized');
        
        const viewerPC = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        });

        peerConnectionsRef.current.set('broadcaster', viewerPC);

        // CRITICAL: Handle incoming tracks
        viewerPC.ontrack = (event) => {
          console.log('📹 [WebRTC] Received track:', event.track.kind);
          if (event.streams && event.streams[0]) {
            videoElement.srcObject = event.streams[0];
            setIsConnected(true);
            setIsConnecting(false);
            console.log('✅ [WebRTC] Video displayed');
          }
        };

        viewerPC.onicecandidate = (event) => {
          if (event.candidate) {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: {
                candidate: event.candidate.toJSON(),
                from: user.id,
                to: 'broadcaster',
              },
            });
          }
        };

        viewerPC.onconnectionstatechange = () => {
          console.log('🔗 [WebRTC] Connection state:', viewerPC.connectionState);
          setIsConnecting(viewerPC.connectionState === 'connecting');
          
          if (viewerPC.connectionState === 'connected') {
            setIsConnected(true);
            setIsConnecting(false);
          } else if (viewerPC.connectionState === 'failed' || viewerPC.connectionState === 'disconnected') {
            setIsConnected(false);
            setIsConnecting(false);
          }
        };

        channelRef.current = supabase
          .channel(`live-stream-${streamId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: user.id }
            }
          })
          
          .on('broadcast', { event: 'broadcaster-offer' }, async ({ payload }) => {
            if (payload.to !== user.id) return;
            console.log('📥 [WebRTC] Received offer from broadcaster');
            try {
              await viewerPC.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await viewerPC.createAnswer();
              await viewerPC.setLocalDescription(answer);
              
              console.log('📤 [WebRTC] Sending answer');
              channelRef.current?.send({
                type: 'broadcast',
                event: 'viewer-answer',
                payload: {
                  answer: answer,
                  from: user.id,
                  to: payload.from,
                },
              });
            } catch (error) {
              console.error('❌ [WebRTC] Error handling offer:', error);
              setIsConnecting(false);
            }
          })
          
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.to !== user.id) return;
            if (payload.candidate) {
              try {
                await viewerPC.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (error) {
                console.error('❌ [WebRTC] Error adding ICE:', error);
              }
            }
          })
          .subscribe(async (status) => {
            console.log('📡 [WebRTC] Viewer channel:', status);
            if (status === 'SUBSCRIBED') {
              await channelRef.current?.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
              });
              
              // === NEW: Send join request ===
              setTimeout(async () => {
                console.log('📤 [WebRTC] Sending join request');
                
                // Create offer first
                const offer = await viewerPC.createOffer();
                await viewerPC.setLocalDescription(offer);
                
                channelRef.current?.send({
                  type: 'broadcast',
                  event: 'viewer-join-request',
                  payload: {
                    viewerId: user.id,
                    offer: offer,
                    timestamp: Date.now(),
                  },
                });
              }, 500);
            }
          });
      }
      
    } catch (error) {
      console.error('❌ [WebRTC] Initialization failed:', error);
      initAttemptedRef.current = false;
      setIsConnecting(false);
      toast.error('Impossible de démarrer le live');
    }
  }, [user?.id, streamId, isBroadcaster, onViewerCountChange]);

  const toggleAudio = useCallback(() => {
    if (webrtcRef.current) {
      const newState = !audioEnabled;
      webrtcRef.current.toggleAudio(newState);
      setAudioEnabled(newState);
    }
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (webrtcRef.current) {
      const newState = !videoEnabled;
      webrtcRef.current.toggleVideo(newState);
      setVideoEnabled(newState);
    }
  }, [videoEnabled]);

  const switchCamera = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.switchCamera();
    }
  }, []);

  useEffect(() => {
    return () => {
      console.log('🧹 [WebRTC] Cleanup...');
      peerConnectionsRef.current.forEach((pc, id) => {
        console.log(`🧹 Closing connection ${id}`);
        pc.close();
      });
      peerConnectionsRef.current.clear();
      
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
        webrtcRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      initAttemptedRef.current = false;
    };
  }, []);

  return {
    initialize,
    isConnected,
    isConnecting,
    audioEnabled,
    videoEnabled,
    viewerCount,
    toggleAudio,
    toggleVideo,
    switchCamera,
  };
};
