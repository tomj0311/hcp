import React, { useState } from 'react';
import { TextField, Button, Typography, Paper, Stack, Link as MuiLink, ToggleButtonGroup, ToggleButton } from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function LoginForm({ onLogin }){
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState(null);
  const [loading,setLoading] = useState(false);
  const [role,setRole] = useState('consumer');

  const submit = async (e)=>{
    e.preventDefault();
    setError(null); setLoading(true);
    try {
  const res = await axios.post(import.meta.env.VITE_API_URL + '/auth/login', { username: email, password });
  if(res.data.role === 'admin' && role !== 'admin'){
        setError('Use admin login page for admin accounts');
      } else {
        onLogin(res.data);
      }
    } catch(e){ setError('Invalid credentials'); } finally { setLoading(false); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:{xs:360, sm:420}, mx:'auto', mt:{xs:2, sm:3}, boxShadow:(theme)=> theme.palette.mode==='dark'? '0 6px 26px -10px rgba(0,0,0,0.6)':'0 6px 24px -8px rgba(0,0,0,0.08)'}} aria-label="login form">
  <Typography variant="h5" sx={{fontWeight:700, mb:2, fontSize:{xs:'1.25rem', sm:'1.5rem'}}}>Sign In</Typography>
      <ToggleButtonGroup exclusive size="small" value={role} onChange={(e,v)=> v && setRole(v)} fullWidth sx={{mb:2}}>
        <ToggleButton value="consumer">Consumer</ToggleButton>
        <ToggleButton value="provider">Provider</ToggleButton>
      </ToggleButtonGroup>
      <Stack spacing={2}>
        <TextField label="Email" type="email" fullWidth value={email} onChange={e=> setEmail(e.target.value)} required size={window.innerWidth < 600 ? 'small' : 'medium'} inputProps={{'aria-label':'username'}} />
        <TextField label="Password" type="password" fullWidth value={password} onChange={e=> setPassword(e.target.value)} required size={window.innerWidth < 600 ? 'small' : 'medium'} inputProps={{'aria-label':'password'}} />
        {error && <Typography color="error" role="alert" sx={{fontSize:{xs:'0.75rem', sm:'0.8rem'}}}>{error}</Typography>}
        <Button variant="contained" fullWidth type="submit" disabled={loading} sx={{mt:1, py:{xs:1, sm:1.1}, fontSize:{xs:'0.85rem', sm:'0.875rem'}}} aria-label="login button">{loading? 'Signing in...':'Login'}</Button>
        <Typography variant="caption" sx={{textAlign:'center', mt:1, fontSize:{xs:'0.65rem', sm:'0.7rem'}}} color="text.secondary">
          New here? <MuiLink component={Link} to="/signup" underline="hover">Create an account</MuiLink>
        </Typography>
        <Typography variant="caption" sx={{textAlign:'center', fontSize:{xs:'0.65rem', sm:'0.7rem'}}} color="text.secondary">
          Admin? <MuiLink component={Link} to="/adminLogin" underline="hover">Admin Sign In</MuiLink>
        </Typography>
      </Stack>
    </Paper>
  );
}
