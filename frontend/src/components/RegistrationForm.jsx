import React, { useState } from 'react';
import { Box, TextField, Button, ToggleButtonGroup, ToggleButton, Typography, Paper } from '@mui/material';
import axios from 'axios';

export default function RegistrationForm(){
  const [role,setRole] = useState('patient');
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [status,setStatus] = useState(null);
  const [password,setPassword] = useState('');
  const [verifyToken,setVerifyToken] = useState('');
  const [enteredToken,setEnteredToken] = useState('');

  const submit = async (e)=>{
    e.preventDefault();
    const endpoint = role==='doctor'? '/users/doctors' : '/users/patients';
    try {
      const payload = role==='doctor'? { name, email } : { name, email, password };
      const res = await axios.post(import.meta.env.VITE_API_URL + endpoint, payload);
      if(role==='patient'){ setVerifyToken(res.data.verifyToken); }
      setStatus('Registered. Check email / use token to verify.');
      setName(''); setEmail('');
      setPassword('');
    } catch(e){
      setStatus('Error');
    }
  };

  const verify = async ()=>{
    try {
      await axios.post(import.meta.env.VITE_API_URL + '/users/patients/verify', { token: enteredToken });
      setStatus('Verified! You can now login.');
    } catch(e){ setStatus('Verification failed'); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:{xs:350, sm:600}, mx:'auto', mt:{xs:2, sm:3}, mb:{xs:2, sm:0}}}>
      <Typography variant="h6" gutterBottom sx={{fontSize:{xs:'1.1rem', sm:'1.25rem'}}}>Register as Doctor or Patient</Typography>
      <ToggleButtonGroup value={role} exclusive onChange={(e,val)=> val && setRole(val)} aria-label="role select" fullWidth sx={{'& .MuiToggleButton-root':{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}}>
        <ToggleButton value="patient" aria-label="patient" data-role="register-patient-mode">Patient</ToggleButton>
        <ToggleButton value="doctor" aria-label="doctor" data-role="register-doctor-mode">Doctor</ToggleButton>
      </ToggleButtonGroup>
      <TextField label="Name" fullWidth margin="normal" value={name} onChange={e=>setName(e.target.value)} required size={window.innerWidth < 600 ? 'small' : 'medium'} />
      <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e=>setEmail(e.target.value)} required size={window.innerWidth < 600 ? 'small' : 'medium'} />
      {role==='patient' && <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e=>setPassword(e.target.value)} required size={window.innerWidth < 600 ? 'small' : 'medium'} />}
      <Button type="submit" variant="contained" sx={{mt:2, fontSize:{xs:'0.85rem', sm:'0.875rem'}}}>Submit</Button>
      {status && <Typography sx={{mt:1, fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>{status}</Typography>}
      {verifyToken && <Typography variant="caption" sx={{display:'block', mt:1, fontSize:{xs:'0.7rem', sm:'0.75rem'}}}>Token (dev only): {verifyToken}</Typography>}
      {verifyToken && <Box sx={{mt:2}}>
        <TextField label="Enter Verification Token" fullWidth margin="normal" value={enteredToken} onChange={e=>setEnteredToken(e.target.value)} size={window.innerWidth < 600 ? 'small' : 'medium'} />
  <Button onClick={verify} variant="outlined" data-role="verify-patient" sx={{fontSize:{xs:'0.85rem', sm:'0.875rem'}}}>Verify</Button>
      </Box>}
    </Paper>
  );
}
