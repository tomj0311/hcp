import React, { useEffect, useState } from 'react';
import { Paper, Typography, CircularProgress, Alert, Button } from '@mui/material';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function EmailVerify(){
  const [search] = useSearchParams();
  const token = search.get('token');
  const [status,setStatus] = useState('verifying'); // verifying | success | error
  const [message,setMessage] = useState('');
  const nav = useNavigate();
  useEffect(()=>{
    if(!token){ setStatus('error'); setMessage('Missing verification token.'); return; }
    let cancelled = false;
    (async()=>{
      try {
        await axios.post(import.meta.env.VITE_API_URL + '/users/consumers/verify', { token });
        if(!cancelled){ setStatus('success'); setMessage('Email verified! You can login now.'); }
      } catch(err){
        if(!cancelled){ setStatus('error'); setMessage(err.response?.data?.error || 'Verification failed'); }
      }
    })();
    return ()=>{ cancelled = true; };
  },[token]);
  return (
    <Paper sx={{p:{xs:3, sm:5}, maxWidth:600, mx:'auto', mt:{xs:2, sm:4}, textAlign:'center'}}>
      <Typography variant="h5" sx={{mb:2, fontWeight:700}}>Email Verification</Typography>
      {status==='verifying' && (<>
        <CircularProgress size={48} sx={{mb:3}} />
        <Typography variant="body2">Verifying your email...</Typography>
      </>)}
      {status!=='verifying' && <Alert severity={status==='success'? 'success':'error'} sx={{mb:3}}>{message}</Alert>}
      {status==='success' && <Button onClick={()=> nav('/login')} variant="contained">Go to Login</Button>}
    </Paper>
  );
}
