import { supabase } from '@/integrations/supabase/client';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private streamId: string | null = null;
  private realtimeChannel: any = null;

  private config: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  async startBroadcast(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<string> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create stream session
      const { data, error } = await supabase.functions.invoke('live-stream-session', {
        body: { action: 'start' },
      });

      if (error) throw error;
      if (!data?.streamId) throw new Error('Failed to create stream session');

      this.streamId = data.streamId;

      // Setup WebRTC peer connection
      this.peerConnection = new RTCPeerConnection(this.config);

      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Setup Realtime channel for signaling
      this.realtimeChannel = supabase.channel(`stream:${this.streamId}`);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate },
          });
        }
      };

      // Listen for viewer answers
      this.realtimeChannel.on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
        if (payload.answer) {
          await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      });

      // Subscribe to channel
      await this.realtimeChannel.subscribe();

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      await supabase.functions.invoke('live-stream-session', {
        body: {
          action: 'signal',
          streamId: this.streamId,
          offer,
        },
      });

      console.log('Broadcast started:', this.streamId);
      return this.streamId;
    } catch (error) {
      console.error('Failed to start broadcast:', error);
      throw error;
    }
  }

  async stopBroadcast(): Promise<void> {
    try {
      if (this.streamId) {
        await supabase.functions.invoke('live-stream-session', {
          body: {
            action: 'stop',
            streamId: this.streamId,
          },
        });
      }

      // Stop all tracks
      this.localStream?.getTracks().forEach((track) => track.stop());

      // Close peer connection
      this.peerConnection?.close();

      // Unsubscribe from channel
      await this.realtimeChannel?.unsubscribe();

      // Clean up
      this.localStream = null;
      this.peerConnection = null;
      this.streamId = null;
      this.realtimeChannel = null;

      console.log('Broadcast stopped');
    } catch (error) {
      console.error('Failed to stop broadcast:', error);
      throw error;
    }
  }

  async joinStream(streamId: string, videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.streamId = streamId;

      // Setup WebRTC peer connection
      this.peerConnection = new RTCPeerConnection(this.config);

      // Setup Realtime channel for signaling
      this.realtimeChannel = supabase.channel(`stream:${streamId}`);

      // Handle incoming tracks
      this.peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        videoElement.srcObject = remoteStream;
        videoElement.play();
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate },
          });
        }
      };

      // Listen for offers from broadcaster
      this.realtimeChannel.on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
        if (payload.offer) {
          await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.offer));

          // Create and send answer
          const answer = await this.peerConnection?.createAnswer();
          await this.peerConnection?.setLocalDescription(answer!);

          await supabase.functions.invoke('live-stream-session', {
            body: {
              action: 'signal',
              streamId,
              answer,
            },
          });
        }
      });

      // Listen for ICE candidates
      this.realtimeChannel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
        if (payload.candidate) {
          await this.peerConnection?.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      });

      // Subscribe to channel
      await this.realtimeChannel.subscribe();

      // Notify broadcaster of viewer join
      await supabase.functions.invoke('live-stream-fanout', {
        body: {
          streamId,
          eventType: 'viewer-joined',
          payload: {},
        },
      });

      console.log('Joined stream:', streamId);
    } catch (error) {
      console.error('Failed to join stream:', error);
      throw error;
    }
  }

  async leaveStream(): Promise<void> {
    try {
      if (this.streamId) {
        await supabase.functions.invoke('live-stream-fanout', {
          body: {
            streamId: this.streamId,
            eventType: 'viewer-left',
            payload: {},
          },
        });
      }

      // Close peer connection
      this.peerConnection?.close();

      // Unsubscribe from channel
      await this.realtimeChannel?.unsubscribe();

      // Clean up
      this.peerConnection = null;
      this.streamId = null;
      this.realtimeChannel = null;

      console.log('Left stream');
    } catch (error) {
      console.error('Failed to leave stream:', error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getStreamId(): string | null {
    return this.streamId;
  }
}

export const webrtcService = new WebRTCService();
