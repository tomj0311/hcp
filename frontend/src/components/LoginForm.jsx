import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import axios from 'axios';

export default function LoginForm({ onLogin }){
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState(null);
  const [loginType,setLoginType] = useState('admin');

  const submit = async (e)=>{
    e.preventDefault();
    try {
      let payload;
      if(loginType==='patient'){
        payload = { username, password }; // username treated as email on backend
      } else {
        payload = { username, password };
      }
      const res = await axios.post(import.meta.env.VITE_API_URL + '/auth/login', payload);
      onLogin(res.data);
    } catch(e){
  setError('Invalid credentials');
    }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:{xs:350, sm:420}, mx:'auto', mt:{xs:4, sm:6, md:10}, boxShadow:(theme)=> theme.palette.mode==='dark'? '0 4px 24px -8px rgba(0,0,0,0.6)':'0 4px 20px -6px rgba(0,0,0,0.08)'}} aria-label="Login form">
      <Typography variant="h5" gutterBottom sx={{fontWeight:700, mb:3, fontSize:{xs:'1.25rem', sm:'1.5rem'}}}>Sign In</Typography>
      <ToggleButtonGroup exclusive value={loginType} onChange={(e,val)=> val && setLoginType(val)} fullWidth size="small" sx={{mb:1, '& .MuiToggleButton-root':{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}} aria-label="login type">
        <ToggleButton value="admin" data-role="login-admin-mode">Admin</ToggleButton>
        <ToggleButton value="patient" data-role="login-patient-mode">Patient</ToggleButton>
      </ToggleButtonGroup>
      <TextField label={loginType==='patient' ? 'Email' : 'Username'} fullWidth margin="normal" value={username} onChange={e=>setUsername(e.target.value)} required inputProps={{'aria-label':'username'}} size={window.innerWidth < 600 ? 'small' : 'medium'} />
      <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e=>setPassword(e.target.value)} required inputProps={{'aria-label':'password'}} size={window.innerWidth < 600 ? 'small' : 'medium'} />
      {error && <Typography color="error" role="alert" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>{error}</Typography>}
  <Button variant="contained" fullWidth type="submit" sx={{mt:3, py:{xs:1, sm:1.1}, fontSize:{xs:'0.85rem', sm:'0.875rem'}}} aria-label="login button">Login</Button>
    </Paper>
  );
}
