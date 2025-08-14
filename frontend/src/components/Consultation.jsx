import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  TextField,
  Tab,
  Tabs,
  Avatar,
  Divider,
  Tooltip,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Switch,
  FormControlLabel,
  Card,
  CardContent
} from '@mui/material';
import { ArrowLeft as ArrowBackIcon, Send as SendIcon, MessageCircle as ChatBubbleOutlineIcon, Mic as MicIcon, MicOff as MicOffIcon, Video as VideocamIcon, VideoOff as VideocamOffIcon, Paperclip as AttachFileIcon, UploadCloud as CloudUploadIcon, Trash2 as DeleteIcon, Settings as SettingsIcon } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Consultation.jsx
 * Omnichannel consultation surface (Chat / Voice / Video placeholders + avatar)
 * Focus: polished UI, accessible, aligned with theme aesthetics.
 */
export default function Consultation(){
  console.log('[Consultation] Component mounting...');
  
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('[Consultation] Route params and hooks initialized', { id, locationState: location.state });

  const [provider,setProvider] = useState(location.state?.provider || null);
  const meetupId = location.state?.meetupId || null;
  const [meetup,setMeetup] = useState(null);
  const [meetupError,setMeetupError] = useState('');
  const [loading,setLoading] = useState(!provider);
  const [channel,setChannel] = useState('video'); // Default to video first
  const [messages,setMessages] = useState(()=>[
  { id:'welcome', role:'system', text:'You are connected to your consultation provider. Your video consultation is ready to begin.' }
  ]);
  const [input,setInput] = useState('');
  const [sending,setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Media controls state
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [showMediaSettings, setShowMediaSettings] = useState(false);
  
  // Draggable video position state
  const [videoPosition, setVideoPosition] = useState({ 
    x: window.innerWidth / 2 - 80, // Center horizontally (80 = half of 160px)
    y: window.innerHeight / 2 - 80 // Center vertically
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const initialAutoScrollSkippedRef = useRef(false);

  // Fetch provider if not in navigation state (deep-link support)
  useEffect(()=>{
  // Debug initial state
  // eslint-disable-next-line no-console
  console.debug('[Consultation] init', { routeId:id, meetupId, providerFromState: !!location.state?.provider });
  console.debug('[Consultation] location.state:', location.state);
  console.debug('[Consultation] current provider:', provider);
  
  if(!provider){
      (async()=>{
        try {
      console.debug('[Consultation] fetching providers list to resolve id');
  const res = await axios.get(import.meta.env.VITE_API_URL + '/users/providers');
      console.debug('[Consultation] providers response:', res.data);
      const found = res.data.find(d=> String(d.id) === String(id));
      console.debug('[Consultation] found provider:', found);
      if(found) setProvider(found);
      else console.warn('[Consultation] provider not found for id', id);
        } catch(e){ 
          console.error('[Consultation] error fetching providers:', e);
        }
        setLoading(false);
      })();
    } else {
      console.debug('[Consultation] provider already available from state');
      setLoading(false);
    }
  },[provider,id]);

  // Fetch meetup details if meetupId provided (adds context & helps debugging)
  useEffect(()=>{
    if(!meetupId) return;
    let cancelled = false;
    (async()=>{
      try {
        setMeetupError('');
        const res = await axios.get(import.meta.env.VITE_API_URL + '/meetups/' + meetupId);
        if(!cancelled) setMeetup(res.data);
      } catch(err){
        if(!cancelled) setMeetupError(err?.response?.data?.error || 'Failed to load meetup');
      }
    })();
    return ()=> { cancelled = true; };
  },[meetupId]);

  // Only auto-scroll after initial mount to avoid jumping page to bottom when component first loads
  useEffect(()=>{
    if(!initialAutoScrollSkippedRef.current){
      initialAutoScrollSkippedRef.current = true; // skip first render
      return;
    }
    chatEndRef.current?.scrollIntoView({behavior:'smooth'});
  },[messages]);

  // No overlay measurement; allow natural document flow.

  // Media control functions
  const requestMediaPermissions = async (audio = false, video = false) => {
    try {
      setMediaError('');
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {};
      if (audio) constraints.audio = true;
      if (video) constraints.video = { width: 640, height: 480 };
      
      if (audio || video) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setMediaStream(stream);
        
        // Set video stream immediately when camera is enabled
        if (videoRef.current && video) {
          videoRef.current.srcObject = stream;
        }
        
        setMicEnabled(audio);
        setCameraEnabled(video);
      } else {
        setMediaStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setMicEnabled(false);
        setCameraEnabled(false);
      }
    } catch (error) {
      console.error('Media permission error:', error);
      let errorMessage = 'Unable to access camera/microphone. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found.';
      } else {
        errorMessage += 'Please check your device settings.';
      }
      setMediaError(errorMessage);
      setMicEnabled(false);
      setCameraEnabled(false);
    }
  };

  const toggleMicrophone = async () => {
    const newMicState = !micEnabled;
    await requestMediaPermissions(newMicState, cameraEnabled);
  };

  const toggleCamera = async () => {
    const newCameraState = !cameraEnabled;
    await requestMediaPermissions(micEnabled, newCameraState);
  };

  // Update video element when media stream changes
  useEffect(() => {
    if (videoRef.current && mediaStream && cameraEnabled) {
      videoRef.current.srcObject = mediaStream;
    } else if (videoRef.current && !cameraEnabled) {
      videoRef.current.srcObject = null;
    }
  }, [mediaStream, cameraEnabled]);

  // Draggable video functions
  const handleMouseDown = (e) => {
    if (!videoContainerRef.current) return;
    
    setIsDragging(true);
    const rect = videoContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  // Update video position on window resize to keep it centered if needed
  useEffect(() => {
    const handleResize = () => {
      const videoSize = window.innerWidth < 600 ? 120 : 160;
      setVideoPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - videoSize),
        y: Math.min(prev.y, window.innerHeight - videoSize)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !videoContainerRef.current) return;
    
    const videoSize = window.innerWidth < 600 ? 120 : 160; // Match responsive sizing
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Constrain to browser window boundaries
    newX = Math.max(0, Math.min(newX, window.innerWidth - videoSize));
    newY = Math.max(0, Math.min(newY, window.innerHeight - videoSize));
    
    setVideoPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch events for mobile dragging
  const handleTouchStart = (e) => {
    if (!videoContainerRef.current) return;
    
    setIsDragging(true);
    const rect = videoContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !videoContainerRef.current) return;
    
    const videoSize = window.innerWidth < 600 ? 120 : 160;
    const touch = e.touches[0];
    
    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;
    
    // Constrain to browser window boundaries
    newX = Math.max(0, Math.min(newX, window.innerWidth - videoSize));
    newY = Math.max(0, Math.min(newY, window.innerHeight - videoSize));
    
    setVideoPosition({ x: newX, y: newY });
    e.preventDefault();
  }, [isDragging, dragOffset]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const sendMessage = useCallback(()=>{
    if(!input.trim()) return;
    const txt = input.trim();
    setMessages(m=> [...m, { id: Date.now()+':user', role:'user', text: txt }]);
    setInput('');
    setSending(true);
    // Placeholder AI response simulation
    setTimeout(()=>{
      setMessages(m=> [...m, { id: Date.now()+':ai', role:'assistant', text:'(Placeholder) A helpful, professionally-aligned response will appear here. Avatar lip-sync + streaming will replace this in production.' }]);
      setSending(false);
    }, 650);
  },[input]);

  const handleKey = (e)=>{
    if(e.key==='Enter' && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const maxSize = 200 * 1024 * 1024; // 200MB
      if (file.size > maxSize) {
        setUploadError(`File "${file.name}" is too large. Maximum size is 200MB.`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setUploadError('');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/uploads/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      // Add upload confirmation message to chat
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      setMessages(m => [...m, { 
        id: Date.now() + ':upload', 
        role: 'system', 
        text: `📎 Files uploaded successfully: ${fileNames}`,
        files: response.data.files
      }]);
      
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{
      display:'flex',
      flexDirection:'column',
      width:'100%',
      maxWidth:{ xs:'100%', lg: 1400 },
      mx:'auto',
      px:{ xs:1, sm:2 },
      boxSizing:'border-box'
    }}>
      {/* Floating Video Preview - anchors bottom-right when settings open */}
  {cameraEnabled && (
        <Box 
          ref={videoContainerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          sx={{ 
            position: 'fixed',
            ...(showMediaSettings
              ? { right: 16, bottom: 16 }
              : { left: videoPosition.x, top: videoPosition.y }),
    width: micEnabled ? { xs: 120, sm: 160, md: 190 } : { xs: 96, sm: 130, md: 160 },
    height: micEnabled ? { xs: 120, sm: 160, md: 190 } : { xs: 96, sm: 130, md: 160 },
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid',
            borderColor: 'primary.main',
            boxShadow: isDragging ? 6 : 3,
            cursor: showMediaSettings ? 'default' : (isDragging ? 'grabbing' : 'grab'),
            zIndex: 9999,
            userSelect: 'none',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease, width 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': {
              boxShadow: 4
            }
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              pointerEvents: 'none'
            }}
          />
          <Typography variant="caption" sx={{ 
            position: 'absolute', 
            bottom: 8, 
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'common.white',
            backgroundColor: (theme)=> theme.palette.mode==='dark'? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)',
            px: 1.5,
            py: 0.5,
            borderRadius: (theme) => theme.shape.borderRadius,
            fontSize: '0.7rem',
            fontWeight: 500,
            pointerEvents: 'none'
          }}>
            You
          </Typography>
        </Box>
      )}

      <Paper elevation={0} sx={{
        p:{xs:1.5, sm:2.5, md:3},
        display:'flex',
        flexDirection:'column',
        flex:1,
        minHeight:0,
        // Use theme's default Paper border radius (will be 8 from theme)
      }} aria-label="consultation chat panel">
        <PageHeader
          title="Video Consultation"
          subtitle={provider ? `with ${provider.name}` : (loading ? 'Loading...' : 'Unknown')}
          onBack={() => navigate('/')}
          actions={(
            <Tooltip title="Media settings">
              <IconButton
                aria-label="media settings"
                onClick={() => setShowMediaSettings(!showMediaSettings)}
                size="large"
                color={showMediaSettings ? 'primary' : 'default'}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          mb={{ xs: 1.5, sm: 2 }}
        />
        {meetupId && (
          <Box component="div" sx={(theme) => ({ ml: { xs: 0, sm: 7 }, mb: 1, fontSize: { xs: '0.75rem', sm: '0.8rem' }, px: 1, py: 0.5, borderRadius: theme.shape.borderRadius / 2, bgcolor: 'action.hover', alignSelf: 'flex-start' })}>
            {meetupError ? `Meetup: ${meetupError}` : (meetup ? `Meetup ${new Date(meetup.start).toLocaleString()}` : 'Loading meetup...')}
          </Box>
        )}
        {/* Media Settings Panel inline (pushes content, allows full growth) */}
        {showMediaSettings && (
          <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontSize: '1.1rem' }}>
                Camera & Microphone Settings
              </Typography>
              {mediaError && (
                <Alert severity="error" sx={{ mb: 2, fontSize: '0.9rem' }}>
                  {mediaError}
                </Alert>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={cameraEnabled}
                      onChange={toggleCamera}
                      size="large"
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {cameraEnabled ? <VideocamIcon color="primary" /> : <VideocamOffIcon />}
                      <Typography sx={{ fontSize: '1rem' }}>
                        Camera {cameraEnabled ? 'On' : 'Off'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={micEnabled}
                      onChange={toggleMicrophone}
                      size="large"
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {micEnabled ? <MicIcon color="primary" /> : <MicOffIcon />}
                      <Typography sx={{ fontSize: '1rem' }}>
                        Microphone {micEnabled ? 'On' : 'Off'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.85rem' }}>
                Turn on your camera and microphone for the best consultation experience
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Tab Navigation with larger, more accessible tabs */}
  <Tabs 
          value={channel} 
          onChange={(e,v)=> setChannel(v)} 
          aria-label="consultation mode selector" 
          variant="fullWidth" 
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              minHeight: { xs: 64, sm: 72 },
              fontSize: { xs: '0.9rem', sm: '1rem' },
              fontWeight: 600,
              textTransform: 'none'
            }
          }}
        >
          <Tab 
            label="Video Call" 
            value="video" 
            icon={cameraEnabled ? <VideocamIcon fontSize="large" /> : <VideocamOffIcon fontSize="large" />} 
            iconPosition="start" 
            sx={{ 
              color: cameraEnabled ? 'primary.main' : 'text.secondary',
            }} 
          />
          <Tab 
            label="Voice Call" 
            value="voice" 
            icon={micEnabled ? <MicIcon fontSize="large" /> : <MicOffIcon fontSize="large" />} 
            iconPosition="start"
            sx={{ 
              color: micEnabled ? 'primary.main' : 'text.secondary',
            }} 
          />
          <Tab 
            label="Text Chat" 
            value="chat" 
            icon={<ChatBubbleOutlineIcon fontSize="large" />} 
            iconPosition="start" 
          />
        </Tabs>
        <Divider sx={{mb:2}} />
        {/* Messages / Content Area */}
        <Box sx={{
          flexGrow:1,
          overflowY:'auto',
          pr:{ xs:0.5, sm:1 },
          scrollbarWidth:'thin',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': (theme)=> ({ backgroundColor: theme.palette.action.disabled, borderRadius: theme.shape.borderRadius / 2 })
        }} aria-label="conversation area">
          {channel==='voice' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ 
                width: { xs: 120, sm: 150 }, 
                height: { xs: 120, sm: 150 }, 
                mx: 'auto', 
                mb: 3,
                boxShadow: '0 8px 28px -10px rgba(0,0,0,0.45)' 
              }} alt="Provider Avatar" />
              <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                Voice Call with {provider?.name || 'Provider'}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                <Button
                  variant={micEnabled ? "contained" : "outlined"}
                  size="large"
                  startIcon={micEnabled ? <MicIcon /> : <MicOffIcon />}
                  onClick={toggleMicrophone}
                  sx={{ 
                    minWidth: 140,
                    fontSize: '1rem',
                    py: 1.5
                  }}
                >
                  {micEnabled ? 'Mute' : 'Unmute'}
                </Button>
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{fontSize: '1rem', lineHeight: 1.6}}>
                {micEnabled ? 'Voice call is active. Speak clearly to communicate with your provider.' : 'Click "Unmute" to start your voice consultation.'}
              </Typography>
            </Box>
          )}
          
          {channel==='video' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Video Call Interface */}
              <Box sx={(theme)=>({
                mb: 2,
                p: { xs:2, sm:3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: `${theme.shape.borderRadius}px`,
                minHeight: { xs: 240, sm: 340, md: 400 },
                background: theme.palette.mode==='dark'
                  ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 65%)`
                  : `linear-gradient(135deg, ${theme.palette.action.hover} 0%, ${theme.palette.background.paper} 65%)`,
                boxShadow: `inset 0 0 0 1px ${theme.palette.divider}`,
                position: 'relative',
                overflow: 'hidden'
              })} aria-label="video call interface">
                
                {/* (Floating preview handled globally outside this container) */}
                
                {/* Provider Video Placeholder */}
                <Avatar sx={{
                  width: { xs: 120, sm: 150 }, 
                  height: { xs: 120, sm: 150 }, 
                  boxShadow: '0 8px 28px -10px rgba(0,0,0,0.45)',
                  mb: 2
                }} alt="Provider Avatar" />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  {provider?.name || 'Provider'}
                </Typography>
                
                {/* Video Controls */}
                <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap:'wrap', justifyContent:'center', rowGap:1 }}>
                  <Button
                    variant={cameraEnabled ? "contained" : "outlined"}
                    size="large"
                    startIcon={cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                    onClick={toggleCamera}
                    sx={{ 
                      minWidth: 140,
                      fontSize: '1rem',
                      py: 1.5
                    }}
                    color={cameraEnabled ? "primary" : "inherit"}
                  >
                    {cameraEnabled ? 'Camera On' : 'Turn On Camera'}
                  </Button>
                  <Button
                    variant={micEnabled ? "contained" : "outlined"}
                    size="large"
                    startIcon={micEnabled ? <MicIcon /> : <MicOffIcon />}
                    onClick={toggleMicrophone}
                    sx={{ 
                      minWidth: 140,
                      fontSize: '1rem',
                      py: 1.5
                    }}
                    color={micEnabled ? "primary" : "inherit"}
                  >
                    {micEnabled ? 'Mic On' : 'Turn On Mic'}
                  </Button>
                </Stack>
                
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', maxWidth: 400, lineHeight: 1.5 }}>
                  {cameraEnabled || micEnabled 
                    ? 'Your video consultation is ready. The provider can see and hear you.'
                    : 'Turn on your camera and microphone to start your video consultation.'
                  }
                </Typography>
              </Box>
              
              {/* Chat Messages for Video Mode - separate scrollable area */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: { xs: 160, sm: 200 }, pr:0.5 }}>
                {messages.map(m=> (
                  <Stack key={m.id} alignItems={m.role==='user'? 'flex-end':'flex-start'} sx={{mb:1.5}}>
                    <Paper variant="outlined" sx={(theme)=>({
                      px:2, py:1.5,
                      maxWidth:'85%',
                      background: m.role==='user'
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 85%)`
                        : m.role==='system'
                        ? (theme.palette.mode==='dark'? theme.palette.action.selected : theme.palette.success.lighter)
                        : (theme.palette.mode==='dark'? theme.palette.background.paper : theme.palette.background.default),
                      color: m.role==='user'? 'common.white': undefined,
                      borderColor: m.role==='user'? 'transparent': 'divider',
                      boxShadow: m.role==='user'? '0 4px 16px -6px rgba(0,0,0,0.45)':'none'
                    })} aria-label={m.role==='user'? 'user message': m.role==='system'? 'system message':'ai message'}>
                      <Typography variant="body2" sx={{fontSize:{xs:'0.8rem', sm:'0.85rem'}, lineHeight: 1.4}}>{m.text}</Typography>
                      {m.files && m.files.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {m.files.map((file, index) => (
                            <Chip
                              key={index}
                              label={file.originalName}
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem', 
                                mr: 0.5, 
                                mb: 0.5,
                                backgroundColor: m.role === 'user' ? (theme)=> theme.palette.action.hover : undefined
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Stack>
                ))}
                <div ref={chatEndRef} />
              </Box>
            </Box>
          )}
          
          {channel==='chat' && (
            <>
              {messages.map(m=> (
                <Stack key={m.id} alignItems={m.role==='user'? 'flex-end':'flex-start'} sx={{mb:2}}>
                  <Paper variant="outlined" sx={(theme)=>({
                    px:2, py:1.5,
                    maxWidth:'85%',
                    background: m.role==='user'
                      ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 85%)`
                      : m.role==='system'
                      ? (theme.palette.mode==='dark'? theme.palette.action.selected : theme.palette.success.lighter)
                      : (theme.palette.mode==='dark'? theme.palette.background.paper : theme.palette.background.default),
                    color: m.role==='user'? 'common.white': undefined,
                    borderColor: m.role==='user'? 'transparent': 'divider',
                    boxShadow: m.role==='user'? '0 4px 16px -6px rgba(0,0,0,0.45)':'none'
                  })} aria-label={m.role==='user'? 'user message': m.role==='system'? 'system message':'ai message'}>
                    <Typography variant="body1" sx={{fontSize:{xs:'0.9rem', sm:'1rem'}, lineHeight: 1.5}}>{m.text}</Typography>
                    {m.files && m.files.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {m.files.map((file, index) => (
                          <Chip
                            key={index}
                            label={file.originalName}
                            size="medium"
                            sx={{ 
                              fontSize: '0.8rem', 
                              mr: 0.5, 
                              mb: 0.5,
                              backgroundColor: m.role === 'user' ? (theme)=> theme.palette.action.hover : undefined
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Stack>
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </Box>
        
        {/* File Upload Section */}
        {(channel === 'chat' || channel === 'video') && (
          <>
            {uploadError && (
              <Alert severity="error" sx={{ mb: 1, fontSize: '0.95rem' }} onClose={() => setUploadError('')}>
                {uploadError}
              </Alert>
            )}
            
            {selectedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '1rem', fontWeight: 600 }}>
                  Selected Files ({selectedFiles.length}):
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${formatFileSize(file.size)})`}
                      onDelete={() => removeFile(index)}
                      deleteIcon={<DeleteIcon />}
                      size="medium"
                      sx={{ fontSize: '0.85rem', py: 1 }}
                    />
                  ))}
                </Stack>
                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={(theme) => ({ height: 8, borderRadius: theme.shape.borderRadius / 2 })} />
                    <Typography variant="body2" sx={{ fontSize: '0.9rem', mt: 1 }}>
                      Uploading files... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    size="large"
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={uploadFiles}
                    disabled={uploading}
                    sx={{ fontSize: '0.9rem', py: 1.2 }}
                  >
                    Upload Files
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    onClick={() => setSelectedFiles([])}
                    disabled={uploading}
                    sx={{ fontSize: '0.9rem', py: 1.2 }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Box>
            )}
          </>
        )}
        
        <Divider sx={{my:2}} />
        
        {/* Enhanced Chat Input with larger, more accessible controls */}
  <Stack direction="row" spacing={{ xs:1, sm:2 }} alignItems="center" component="form" onSubmit={(e)=>{e.preventDefault(); sendMessage();}} aria-label="chat input form" sx={{ mt:{ xs:1, sm:2 } }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
            style={{ display: 'none' }}
          />
          <IconButton
            color="primary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="attach files"
            disabled={channel === 'voice'}
            size="large"
            sx={{
              borderRadius: '50%',
              width: { xs:42, sm:48 },
              height: { xs:42, sm:48 },
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              flexShrink: 0,
              '&:hover': {
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white'
              }
            }}
          >
            <AttachFileIcon />
          </IconButton>
          <TextField
            size="medium"
            placeholder={channel==='chat' || channel==='video'? 'Type your message here...':'Voice mode - use microphone to speak'}
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            disabled={channel==='voice'}
            value={input}
            onChange={e=> setInput(e.target.value)}
            onKeyDown={handleKey}
            inputProps={{'aria-label':'chat input'}}
            sx={{
              '& .MuiInputBase-root': {
                alignItems: 'flex-start',
                paddingTop: 2,
                fontSize: '1rem'
              },
              '& .MuiInputBase-input': {
                fontSize: '1rem'
              }
            }}
          />
      <IconButton 
            color="primary" 
            type="submit" 
            aria-label="send message" 
            disabled={!input.trim() || sending || channel==='voice'}
            size="large"
            sx={{
              borderRadius: '50%',
        width: { xs:42, sm:48 },
        height: { xs:42, sm:48 },
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: input.trim() ? 'primary.main' : 'background.paper',
              color: input.trim() ? 'common.white' : 'primary.main',
              flexShrink: 0,
              '&:hover': {
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white'
              },
              '&:disabled': {
                borderColor: 'divider',
                color: 'text.disabled'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{mt:1.5, fontSize:{xs:'0.8rem', sm:'0.85rem'}, textAlign: 'center', lineHeight: 1.4}}>
          This is a secure consultation platform. Your privacy is protected. 
          Video and voice calls connect you directly with professional consultants.
        </Typography>
      </Paper>
    </Box>
  );
}
