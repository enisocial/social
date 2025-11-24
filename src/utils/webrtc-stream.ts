// WebRTC Live Streaming System - Full Implementation
export class WebRTCStream {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize broadcaster (streamer)
  async initBroadcaster(videoElement: HTMLVideoElement): Promise<MediaStream> {
    try {
      console.log('🎥 [BROADCASTER] Starting camera access...');
      
      // Try multiple camera configurations with fallback
      const cameraConfigs = [
        // High quality (ideal for modern devices)
        {
          video: {
            width: { ideal: 720 },
            height: { ideal: 1280 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
        // Medium quality (fallback)
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: true,
        },
        // Minimal constraints (last resort)
        {
          video: true,
          audio: true,
        },
      ];

      let lastError: Error | null = null;

      // Try each configuration until one works
      for (const config of cameraConfigs) {
        try {
          console.log('📹 [BROADCASTER] Trying camera config:', config);
          this.localStream = await navigator.mediaDevices.getUserMedia(config);
          console.log('✅ [BROADCASTER] Camera access granted with config:', config);
          break;
        } catch (error) {
          console.warn('⚠️ [BROADCASTER] Config failed, trying next:', error);
          lastError = error as Error;
          continue;
        }
      }

      if (!this.localStream) {
        throw lastError || new Error('Failed to access camera');
      }

      console.log('📹 [BROADCASTER] Stream tracks:', this.localStream.getTracks().map(t => `${t.kind} (${t.label})`));

      // Attach to video element IMMEDIATELY
      videoElement.srcObject = this.localStream;
      videoElement.muted = true;
      
      // Force play
      try {
        await videoElement.play();
        console.log('▶️ [BROADCASTER] Video playing');
      } catch (playError) {
        console.warn('⚠️ [BROADCASTER] Autoplay prevented:', playError);
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          console.log(`➕ [BROADCASTER] Adding ${track.kind} track`);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create data channel
      this.dataChannel = this.peerConnection.createDataChannel('live-data');
      this.setupDataChannel();

      console.log('✅ [BROADCASTER] Fully initialized');
      return this.localStream;
    } catch (error) {
      console.error('❌ [BROADCASTER] Initialization failed:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission refusée. Autorisez l\'accès à la caméra.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('Caméra introuvable. Vérifiez vos appareils.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Caméra déjà utilisée par une autre application.');
        }
      }
      throw new Error('Impossible d\'accéder à la caméra.');
    }
  }

  // Initialize viewer
  async initViewer(videoElement: HTMLVideoElement): Promise<void> {
    try {
      console.log('👀 [VIEWER] Initializing...');
      
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Handle incoming tracks from broadcaster
      this.peerConnection.ontrack = (event) => {
        console.log('📹 [VIEWER] Received remote track:', event.track.kind, event.streams.length);
        
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          videoElement.srcObject = this.remoteStream;
          console.log('✅ [VIEWER] Remote stream attached to video element');
          
          // Force play
          videoElement.play().catch(e => console.warn('⚠️ [VIEWER] Autoplay prevented:', e));
        }
        
        if (this.onRemoteStreamCallback && this.remoteStream) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      };

      // Handle data channel for chat/reactions
      this.peerConnection.ondatachannel = (event) => {
        console.log('📡 [VIEWER] Data channel received');
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };

      // Log connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('🔗 [VIEWER] Connection state:', this.peerConnection?.connectionState);
      };

      console.log('✅ [VIEWER] Initialized and waiting for stream');
    } catch (error) {
      console.error('❌ [VIEWER] Initialization failed:', error);
      throw error;
    }
  }

  // Setup data channel for chat/reactions
  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('📡 Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('📡 Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('❌ Data channel error:', error);
    };
  }

  // Send data through data channel
  sendData(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  // Toggle audio
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  // Switch camera (front/back)
  async switchCamera() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      // Stop current video track
      videoTrack.stop();

      // Get new stream with different camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Replace track in local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);

      console.log('🔄 Camera switched successfully');
    } catch (error) {
      console.error('❌ Error switching camera:', error);
    }
  }

  // Create offer (for broadcaster)
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  // Create answer (for viewer)
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  // Set remote description
  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  }

  // Add ICE candidate
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // Set ICE candidate handler
  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          callback(event.candidate);
        }
      };
    }
  }

  // Set remote stream handler
  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up WebRTC resources...');

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    console.log('✅ Cleanup complete');
  }
}
