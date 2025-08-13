import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Stack, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminLogin({ onLogin }){
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState(null);
  const [loading,setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e)=>{
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + '/auth/login', { username, password });
      if(res.data.role !== 'admin'){
        setError('Not an admin account');
      } else {
        onLogin(res.data);
      }
    } catch(e){ setError('Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:{xs:360, sm:420}, mx:'auto', mt:{xs:2, sm:3}, boxShadow:(theme)=> theme.palette.mode==='dark'? '0 6px 26px -10px rgba(0,0,0,0.65)':'0 6px 24px -8px rgba(0,0,0,0.08)'}} aria-label="Admin login form">
      <Typography variant="h5" sx={{fontWeight:700, mb:3, fontSize:{xs:'1.25rem', sm:'1.5rem'}}}>Admin Sign In</Typography>
      <Stack spacing={2}>
        <TextField label="Username" value={username} onChange={e=> setUsername(e.target.value)} fullWidth required size={window.innerWidth < 600 ? 'small':'medium'} inputProps={{'aria-label':'username'}} />
        <TextField label="Password" type="password" value={password} onChange={e=> setPassword(e.target.value)} fullWidth required size={window.innerWidth < 600 ? 'small':'medium'} inputProps={{'aria-label':'password'}} />
        {error && <Typography color="error" sx={{fontSize:{xs:'0.75rem', sm:'0.8rem'}}} role="alert">{error}</Typography>}
        <Button variant="contained" type="submit" fullWidth disabled={loading} sx={{py:{xs:1, sm:1.1}, fontSize:{xs:'0.85rem', sm:'0.9rem'}}} aria-label="admin login button">{loading? 'Signing in...':'Login'}</Button>
        <Typography variant="caption" color="text.secondary" sx={{textAlign:'center', mt:1, fontSize:{xs:'0.65rem', sm:'0.7rem'}}}>
          Need consumer access? <MuiLink component={Link} to="/login">Consumer Sign In</MuiLink>
        </Typography>
      </Stack>
    </Paper>
  );
}
