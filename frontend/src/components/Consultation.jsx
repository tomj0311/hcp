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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Consultation.jsx
 * Omnichannel consultation surface (Chat / Voice / Video placeholders + avatar)
 * Focus: polished UI, accessible, aligned with theme aesthetics.
 */
export default function Consultation(){
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [doctor,setDoctor] = useState(location.state?.doctor || null);
  const [loading,setLoading] = useState(!doctor);
  const [channel,setChannel] = useState('video'); // Default to video first
  const [messages,setMessages] = useState(()=>[
    { id:'welcome', role:'system', text:'You are connected to the AI virtual doctor. Your video consultation is ready to begin.' }
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

  // Fetch doctor if not in navigation state (deep-link support)
  useEffect(()=>{
    if(!doctor){
      (async()=>{
        try {
          const res = await axios.get(import.meta.env.VITE_API_URL + '/users/doctors');
          const found = res.data.find(d=> String(d.id) === String(id));
          if(found) setDoctor(found);
        } catch(e){ /* silent */ }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  },[doctor,id]);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

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
      setMessages(m=> [...m, { id: Date.now()+':ai', role:'assistant', text:'(Placeholder) A helpful, medically-aligned response will appear here. Avatar lip-sync + streaming will replace this in production.' }]);
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

      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/uploads/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
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
    <Box sx={{display:'flex', flexDirection:'column', height:'calc(100vh - 140px)'}}>
      {/* Floating Video Preview - Always visible when camera is enabled */}
      {cameraEnabled && (
        <Box 
          ref={videoContainerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          sx={{ 
            position: 'fixed',
            left: videoPosition.x,
            top: videoPosition.y,
            width: { xs: 120, sm: 160 }, 
            height: { xs: 120, sm: 160 },
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid',
            borderColor: 'primary.main',
            boxShadow: isDragging ? 6 : 3,
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 9999,
            userSelect: 'none',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
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
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.7)',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            fontSize: '0.7rem',
            fontWeight: 500,
            pointerEvents: 'none'
          }}>
            You
          </Typography>
        </Box>
      )}

      <Paper elevation={0} sx={{p:{xs:2, sm:3}, display:'flex', flexDirection:'column', flex:1, minHeight:0}} aria-label="consultation chat panel">
        <Stack direction="row" spacing={1} alignItems="center" sx={{mb:2}}>
          <Tooltip title="Back to dashboard"><IconButton aria-label="back" onClick={()=> navigate('/')} size="large"><ArrowBackIcon fontSize="large" /></IconButton></Tooltip>
          <Typography variant="h5" sx={{fontWeight:700, fontSize:{xs:'1.2rem', sm:'1.4rem'}}}>Video Consultation</Typography>
          <Box component="span" sx={{ml:1, opacity:0.8, fontSize:{xs:'0.9rem', sm:'1rem'}, fontWeight:500}}>{doctor? `with Dr. ${doctor.name}` : (loading? 'Loading...' : 'Unknown')}</Box>
          <Box sx={{flexGrow:1}} />
          <Tooltip title="Media settings">
            <IconButton 
              aria-label="media settings" 
              onClick={() => setShowMediaSettings(!showMediaSettings)} 
              size="large"
              color={showMediaSettings ? "primary" : "default"}
            >
              <SettingsIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Media Settings Panel */}
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
        <Box sx={{flexGrow:1, overflowY:'auto', pr:1}} aria-label="conversation area">
          {channel==='voice' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ 
                width: { xs: 120, sm: 150 }, 
                height: { xs: 120, sm: 150 }, 
                mx: 'auto', 
                mb: 3,
                boxShadow: '0 8px 28px -10px rgba(0,0,0,0.45)' 
              }} alt="Doctor Avatar" />
              <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                Voice Call with Dr. {doctor?.name || 'Doctor'}
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
                {micEnabled ? 'Voice call is active. Speak clearly to communicate with your doctor.' : 'Click "Unmute" to start your voice consultation.'}
              </Typography>
            </Box>
          )}
          
          {channel==='video' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Video Call Interface */}
              <Box sx={({palette})=>({
                mb: 2,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: 3,
                minHeight: { xs: 300, sm: 400 },
                background: palette.mode==='dark'
                  ? 'linear-gradient(135deg,#1f1f1f 0%,#141414 65%)'
                  : 'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 65%)',
                boxShadow: palette.mode==='dark'? 'inset 0 0 0 1px #262626' : 'inset 0 0 0 1px #d5dbe3',
                position: 'relative',
                overflow: 'hidden'
              })} aria-label="video call interface">
                
                {/* Floating Draggable User's Video Preview */}
                {cameraEnabled && (
                  <Box 
                    ref={videoContainerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    sx={{ 
                      position: 'fixed', // Changed from absolute to fixed for screen-wide positioning
                      left: videoPosition.x,
                      top: videoPosition.y,
                      width: { xs: 120, sm: 160 }, 
                      height: { xs: 120, sm: 160 },
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid',
                      borderColor: 'primary.main',
                      boxShadow: isDragging ? 6 : 3,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      zIndex: 9999, // High z-index to appear above everything
                      userSelect: 'none',
                      transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
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
                        transform: 'scaleX(-1)', // Mirror effect
                        pointerEvents: 'none' // Prevent video from interfering with drag
                      }}
                    />
                    <Typography variant="caption" sx={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: 'white',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      pointerEvents: 'none'
                    }}>
                      You
                    </Typography>
                  </Box>
                )}
                
                {/* Doctor's Video Placeholder */}
                <Avatar sx={{
                  width: { xs: 120, sm: 150 }, 
                  height: { xs: 120, sm: 150 }, 
                  boxShadow: '0 8px 28px -10px rgba(0,0,0,0.45)',
                  mb: 2
                }} alt="Doctor Avatar" />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  Dr. {doctor?.name || 'Doctor'}
                </Typography>
                
                {/* Video Controls */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                    ? 'Your video consultation is ready. The doctor can see and hear you.'
                    : 'Turn on your camera and microphone to start your video consultation.'
                  }
                </Typography>
              </Box>
              
              {/* Chat Messages for Video Mode - separate scrollable area */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 200 }}>
                {messages.map(m=> (
                  <Stack key={m.id} alignItems={m.role==='user'? 'flex-end':'flex-start'} sx={{mb:1.5}}>
                    <Paper variant="outlined" sx={({palette})=>({
                      px:2, py:1.5,
                      maxWidth:'85%',
                      background: m.role==='user'
                        ? (palette.mode==='dark' ? 'linear-gradient(135deg,#1273ea 0%,#1565c0 85%)':'linear-gradient(135deg,#1273ea 0%,#0d5fb1 85%)')
                        : m.role==='system'
                        ? (palette.mode==='dark'? '#2a2a2a':'#e8f5e8')
                        : (palette.mode==='dark'? '#1e1e1e':'#f5f7fb'),
                      color: m.role==='user'? '#fff': undefined,
                      borderColor: m.role==='user'? 'transparent': (palette.mode==='dark'? '#272727':'#dfe3ea'),
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
                                backgroundColor: m.role === 'user' ? 'rgba(255,255,255,0.2)' : undefined
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
                  <Paper variant="outlined" sx={({palette})=>({
                    px:2, py:1.5,
                    maxWidth:'85%',
                    background: m.role==='user'
                      ? (palette.mode==='dark' ? 'linear-gradient(135deg,#1273ea 0%,#1565c0 85%)':'linear-gradient(135deg,#1273ea 0%,#0d5fb1 85%)')
                      : m.role==='system'
                      ? (palette.mode==='dark'? '#2a2a2a':'#e8f5e8')
                      : (palette.mode==='dark'? '#1e1e1e':'#f5f7fb'),
                    color: m.role==='user'? '#fff': undefined,
                    borderColor: m.role==='user'? 'transparent': (palette.mode==='dark'? '#272727':'#dfe3ea'),
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
                              backgroundColor: m.role === 'user' ? 'rgba(255,255,255,0.2)' : undefined
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
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 1 }} />
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
        <Stack direction="row" spacing={2} alignItems="center" component="form" onSubmit={(e)=>{e.preventDefault(); sendMessage();}} aria-label="chat input form">
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
              width: 48,
              height: 48,
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
              width: 48,
              height: 48,
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: input.trim() ? 'primary.main' : 'background.paper',
              color: input.trim() ? 'white' : 'primary.main',
              flexShrink: 0,
              '&:hover': {
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white'
              },
              '&:disabled': {
                borderColor: 'grey.300',
                color: 'grey.400'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{mt:1.5, fontSize:{xs:'0.8rem', sm:'0.85rem'}, textAlign: 'center', lineHeight: 1.4}}>
          This is a secure consultation platform. Your privacy is protected. 
          Video and voice calls connect you directly with healthcare professionals.
        </Typography>
      </Paper>
    </Box>
  );
}
