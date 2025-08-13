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
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MicNoneIcon from '@mui/icons-material/MicNone';
import VideocamIcon from '@mui/icons-material/Videocam';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [channel,setChannel] = useState('chat');
  const [messages,setMessages] = useState(()=>[
    { id:'welcome', role:'system', text:'You are connected to the AI virtual doctor. Ask any health question to begin.' }
  ]);
  const [input,setInput] = useState('');
  const [sending,setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

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
      <Paper elevation={0} sx={{p:{xs:2, sm:3}, display:'flex', flexDirection:'column', flex:1, minHeight:0}} aria-label="consultation chat panel">
        <Stack direction="row" spacing={1} alignItems="center" sx={{mb:1}}>
          <Tooltip title="Back to dashboard"><IconButton aria-label="back" onClick={()=> navigate('/')} size="small"><ArrowBackIcon /></IconButton></Tooltip>
          <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.15rem'}}}>Consultation</Typography>
          <Box component="span" sx={{ml:1, opacity:0.8, fontSize:{xs:'0.7rem', sm:'0.75rem'}, fontWeight:500}}>{doctor? doctor.name : (loading? 'Loading...' : 'Unknown')}</Box>
          <Box sx={{flexGrow:1}} />
        </Stack>
        <Tabs value={channel} onChange={(e,v)=> setChannel(v)} aria-label="channel selector" variant="fullWidth" sx={{mb:1}}>
          <Tab label="Chat" value="chat" icon={<ChatBubbleOutlineIcon />} iconPosition="start" sx={{fontSize:{xs:'0.68rem', sm:'0.72rem'}}} />
          <Tab label="Voice" value="voice" icon={<MicNoneIcon />} iconPosition="start" sx={{fontSize:{xs:'0.68rem', sm:'0.72rem'}}} />
          <Tab label="Video" value="video" icon={<VideocamIcon />} iconPosition="start" sx={{fontSize:{xs:'0.68rem', sm:'0.72rem'}}} />
        </Tabs>
        <Divider sx={{mb:2}} />
        {/* Messages / Content Area */}
        <Box sx={{flexGrow:1, overflowY:'auto', pr:1}} aria-label="conversation area">
          {channel==='voice' && (
            <Typography variant="body2" color="text.secondary" sx={{fontSize:{xs:'0.72rem', sm:'0.78rem'}, textAlign:'center', mt:4}}>
              Voice channel placeholder: Speech-to-text + TTS pipeline will appear here.
            </Typography>
          )}
          {(channel==='chat' || channel==='video') && (
            <>
              {channel==='video' && (
                <Box sx={({palette})=>({
                  mb:2,
                  p:2,
                  display:'flex',
                  flexDirection:'column',
                  alignItems:'center',
                  justifyContent:'center',
                  textAlign:'center',
                  borderRadius:2,
                  background: palette.mode==='dark'
                    ? 'linear-gradient(135deg,#1f1f1f 0%,#141414 65%)'
                    : 'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 65%)',
                  boxShadow: palette.mode==='dark'? 'inset 0 0 0 1px #262626' : 'inset 0 0 0 1px #d5dbe3'
                })} aria-label="video avatar placeholder">
                  <Avatar sx={{width:{xs:96, sm:118}, height:{xs:96, sm:118}, boxShadow:'0 8px 28px -10px rgba(0,0,0,0.45)'}} alt="Doctor Avatar" />
                  <Typography variant="subtitle1" sx={{fontWeight:600, mt:1}}>Doctor Avatar</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{fontSize:{xs:'0.65rem', sm:'0.7rem'}}}>Video stream & lip-sync will render here.</Typography>
                </Box>
              )}
              {messages.map(m=> (
                <Stack key={m.id} alignItems={m.role==='user'? 'flex-end':'flex-start'} sx={{mb:1.5}}>
                  <Paper variant="outlined" sx={({palette})=>({
                    px:1.5, py:1,
                    maxWidth:'80%',
                    background: m.role==='user'
                      ? (palette.mode==='dark' ? 'linear-gradient(135deg,#1273ea 0%,#1565c0 85%)':'linear-gradient(135deg,#1273ea 0%,#0d5fb1 85%)')
                      : m.role==='system'
                      ? (palette.mode==='dark'? '#2a2a2a':'#e8f5e8')
                      : (palette.mode==='dark'? '#1e1e1e':'#f5f7fb'),
                    color: m.role==='user'? '#fff': undefined,
                    borderColor: m.role==='user'? 'transparent': (palette.mode==='dark'? '#272727':'#dfe3ea'),
                    boxShadow: m.role==='user'? '0 4px 16px -6px rgba(0,0,0,0.45)':'none'
                  })} aria-label={m.role==='user'? 'user message': m.role==='system'? 'system message':'ai message'}>
                    <Typography variant="body2" sx={{fontSize:{xs:'0.7rem', sm:'0.78rem'}}}>{m.text}</Typography>
                    {m.files && m.files.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {m.files.map((file, index) => (
                          <Chip
                            key={index}
                            label={file.originalName}
                            size="small"
                            sx={{ 
                              fontSize: '0.65rem', 
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
            </>
          )}
          <div ref={chatEndRef} />
        </Box>
        
        {/* File Upload Section */}
        {(channel === 'chat' || channel === 'video') && (
          <>
            {uploadError && (
              <Alert severity="error" sx={{ mb: 1 }} onClose={() => setUploadError('')}>
                {uploadError}
              </Alert>
            )}
            
            {selectedFiles.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '0.75rem' }}>
                  Selected Files ({selectedFiles.length}):
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${formatFileSize(file.size)})`}
                      onDelete={() => removeFile(index)}
                      deleteIcon={<DeleteIcon />}
                      size="small"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                </Stack>
                {uploading && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                      Uploading... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={uploadFiles}
                    disabled={uploading}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Upload Files
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSelectedFiles([])}
                    disabled={uploading}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Box>
            )}
          </>
        )}
        
        <Divider sx={{my:1}} />
        <Stack direction="row" spacing={1} component="form" onSubmit={(e)=>{e.preventDefault(); sendMessage();}} aria-label="chat input form">
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
            size="small"
            sx={{
              borderRadius: '50%',
              aspectRatio: '1/1',
              width: 40,
              height: 40,
              '&:hover': {
                borderRadius: '50%'
              }
            }}
          >
            <AttachFileIcon />
          </IconButton>
          <TextField
            size="small"
            placeholder={channel==='chat' || channel==='video'? 'Type your message...':'Channel is in placeholder mode'}
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            disabled={channel==='voice'}
            value={input}
            onChange={e=> setInput(e.target.value)}
            onKeyDown={handleKey}
            inputProps={{'aria-label':'chat input'}}
            sx={{
              '& .MuiInputBase-root': {
                alignItems: 'flex-start',
                paddingTop: 1
              }
            }}
          />
          <IconButton 
            color="primary" 
            type="submit" 
            aria-label="send message" 
            disabled={!input.trim() || sending || channel==='voice'}
            sx={{
              borderRadius: '50%',
              aspectRatio: '1/1',
              width: 40,
              height: 40,
              '&:hover': {
                borderRadius: '50%'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{mt:0.75, fontSize:{xs:'0.6rem', sm:'0.65rem'}}}>
          Prototype: Messages stay local. Future: real-time AI responses & synchronized avatar. 
          Files are uploaded to secure user folders (max 200MB each).
        </Typography>
      </Paper>
    </Box>
  );
}
