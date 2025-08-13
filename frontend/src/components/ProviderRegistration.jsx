import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import axios from 'axios';

export default function ProviderRegistration({ admin=false, token }){
  const [form,setForm] = useState({ name:'', email:'', password:'' });
  const [status,setStatus] = useState('');
  const [phase,setPhase] = useState('form');
  const [loading,setLoading] = useState(false);
  const onChange = e=> setForm(f=> ({...f, [e.target.name]: e.target.value}));
  const submit = async e => {
    e.preventDefault(); setLoading(true); setStatus('');
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + '/users/providers', form, admin? { headers:{ Authorization:`Bearer ${token}` }}: undefined);
      setPhase('done'); setStatus('Provider registered.' + (res.data.tempPassword? ` Temp password: ${res.data.tempPassword}`:''));
    } catch(err){ setStatus(err.response?.data?.message || 'Registration failed'); } finally { setLoading(false); }
  };
  return (
    <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:4}, maxWidth:480, mx:'auto', mt:{xs:2, sm:4}, boxShadow:(t)=> t.palette.mode==='dark'? '0 6px 26px -10px rgba(0,0,0,0.6)':'0 6px 24px -8px rgba(0,0,0,0.08)'}}>
      <Typography variant="h5" sx={{fontWeight:700, mb:2, fontSize:{xs:'1.25rem', sm:'1.4rem'}}}>{admin? 'Admin: Create Provider':'Provider Registration'}</Typography>
      {status && <Alert severity={status.toLowerCase().includes('fail')? 'error':'info'} sx={{mb:2}}>{status}</Alert>}
      {phase==='form' && (
        <Stack spacing={2}>
          <TextField name="name" label="Full Name" value={form.name} onChange={onChange} required size={window.innerWidth<600?'small':'medium'} />
          <TextField name="email" type="email" label="Email" value={form.email} onChange={onChange} required size={window.innerWidth<600?'small':'medium'} />
          <TextField name="password" type="password" label="Password (optional)" value={form.password} onChange={onChange} size={window.innerWidth<600?'small':'medium'} helperText={form.password? 'Min 8 characters':'Leave blank to auto-generate'} />
          <Button type="submit" variant="contained" disabled={loading}>{loading? 'Saving...':'Register'}</Button>
        </Stack>
      )}
      {phase==='done' && (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h6" sx={{fontWeight:600}}>All set!</Typography>
          <Typography variant="body2">Provider account ready.</Typography>
          <Button href="/login" variant="contained">Go to Login</Button>
        </Stack>
      )}
    </Paper>
  );
}
