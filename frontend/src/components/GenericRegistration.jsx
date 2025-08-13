import React, { useState } from 'react';
import { Paper, Typography, ToggleButtonGroup, ToggleButton, TextField, Button, Stack, Alert } from '@mui/material';
import axios from 'axios';

// Simple, responsive, provider/consumer generic registration
export default function GenericRegistration(){
  const [type,setType] = useState('consumer');
  const [form,setForm] = useState({ name:'', email:'', password:'' });
  const [verifyToken,setVerifyToken] = useState('');
  const [enteredToken,setEnteredToken] = useState('');
  const [phase,setPhase] = useState('form'); // form | verify | done
  const [status,setStatus] = useState('');
  const [loading,setLoading] = useState(false);

  const onChange = e=> setForm(f=> ({...f, [e.target.name]: e.target.value}));

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setStatus('');
    try {
      if(type==='consumer'){
        const res = await axios.post(import.meta.env.VITE_API_URL + '/users/consumers', { name: form.name, email: form.email, password: form.password });
        setVerifyToken(res.data.verifyToken);
        setPhase('verify');
        setStatus('Consumer account created. Check email (dev token below).');
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/users/providers', { name: form.name, email: form.email, password: form.password });
        setPhase('done');
        setStatus('Provider registered. You can login now.');
      }
    } catch(err){
      setStatus(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const verify = async ()=>{
    if(!enteredToken.trim()) return;
    setLoading(true); setStatus('');
    try {
      await axios.post(import.meta.env.VITE_API_URL + '/users/consumers/verify', { token: enteredToken.trim() });
      setPhase('done');
      setStatus('Email verified! You can login now.');
    } catch(err){ setStatus(err.response?.data?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:480, mx:'auto', mt:{xs:2, sm:4}, boxShadow:(t)=> t.palette.mode==='dark'? '0 6px 26px -10px rgba(0,0,0,0.6)':'0 6px 24px -8px rgba(0,0,0,0.08)'}}>
      <Typography variant="h5" sx={{fontWeight:700, mb:2, fontSize:{xs:'1.25rem', sm:'1.4rem'}}}>Create Account</Typography>
      <ToggleButtonGroup value={type} exclusive onChange={(e,val)=> val && setType(val)} fullWidth size="small" sx={{mb:2}}>
        <ToggleButton value="consumer">Consumer</ToggleButton>
        <ToggleButton value="provider">Provider</ToggleButton>
      </ToggleButtonGroup>
      {status && <Alert severity={status.toLowerCase().includes('fail')? 'error':'info'} sx={{mb:2}}>{status}</Alert>}
      {phase==='form' && (
        <Stack spacing={2}>
          <TextField name="name" label="Full Name" value={form.name} onChange={onChange} required size={window.innerWidth<600?'small':'medium'} />
          <TextField name="email" type="email" label="Email" value={form.email} onChange={onChange} required size={window.innerWidth<600?'small':'medium'} />
          <TextField name="password" type="password" label="Password" value={form.password} onChange={onChange} required size={window.innerWidth<600?'small':'medium'} helperText="Min 8 characters" />
          <Button type="submit" variant="contained" disabled={loading}>{loading? 'Saving...':'Register'}</Button>
        </Stack>
      )}
      {phase==='verify' && (
        <Stack spacing={2}>
          <Typography variant="body2">Enter the verification token sent to your email.</Typography>
            {verifyToken && <Alert severity="warning" variant="outlined">Dev Token: {verifyToken}</Alert>}
          <TextField label="Verification Token" value={enteredToken} onChange={e=> setEnteredToken(e.target.value)} size={window.innerWidth<600?'small':'medium'} />
          <Button onClick={verify} variant="contained" disabled={loading || !enteredToken.trim()}>{loading? 'Verifying...':'Verify Email'}</Button>
        </Stack>
      )}
      {phase==='done' && (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h6" sx={{fontWeight:600}}>All set!</Typography>
          <Typography variant="body2">Your {type} account is ready.</Typography>
          <Button href="/login" variant="contained">Go to Login</Button>
        </Stack>
      )}
    </Paper>
  );
}
