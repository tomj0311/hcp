import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Grid, Alert, Stack } from '@mui/material';
import axios from 'axios';

export default function DoctorRegistration(){
  const [form,setForm] = useState({ name:'', email:'', specialization:'', yearsExperience:'', bio:'', aiAgent:'' });
  const [status,setStatus] = useState(null);
  const [loading,setLoading] = useState(false);

  const onChange = e=> setForm(f=> ({...f, [e.target.name]: e.target.value}));

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      const payload = { ...form, yearsExperience: form.yearsExperience? Number(form.yearsExperience): undefined };
      await axios.post(import.meta.env.VITE_API_URL + '/users/doctors', payload, { headers:{ 'Content-Type':'application/json' }});
      setStatus('Doctor registered successfully');
      setForm({ name:'', email:'', specialization:'', yearsExperience:'', bio:'', aiAgent:'' });
    } catch(err){ setStatus('Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <Paper sx={{p:{xs:3, md:5}, maxWidth:{xs:350, sm:900}, mx:'auto', mt:{xs:2, sm:4, md:6}, boxShadow:(theme)=> theme.palette.mode==='dark'? '0 6px 28px -8px rgba(0,0,0,0.7)':'0 6px 24px -8px rgba(0,0,0,0.1)'}}>
      <Typography variant="h5" sx={{fontWeight:700, mb:3, fontSize:{xs:'1.25rem', sm:'1.5rem'}}}>Doctor Registration</Typography>
      {status && <Alert severity={status.includes('failed')?'error':'success'} sx={{mb:2}}>{status}</Alert>}
      <Box component="form" onSubmit={submit} noValidate>
        <Grid container spacing={{xs:2, sm:2}} columns={{xs:12, sm:12, md:12}}>
          <Grid item xs={12} sm={6}><TextField label="Full Name" name="name" value={form.name} onChange={onChange} fullWidth required size={window.innerWidth < 600 ? 'small' : 'medium'}/></Grid>
          <Grid item xs={12} sm={6}><TextField label="Email" type="email" name="email" value={form.email} onChange={onChange} fullWidth required size={window.innerWidth < 600 ? 'small' : 'medium'}/></Grid>
          <Grid item xs={12} sm={6}><TextField label="Specialization" name="specialization" value={form.specialization} onChange={onChange} fullWidth placeholder="Cardiology, Neurology..." size={window.innerWidth < 600 ? 'small' : 'medium'}/></Grid>
          <Grid item xs={12} sm={6}><TextField label="Years Experience" name="yearsExperience" value={form.yearsExperience} onChange={onChange} fullWidth size={window.innerWidth < 600 ? 'small' : 'medium'}/></Grid>
          <Grid item xs={12}><TextField label="Short Bio" name="bio" value={form.bio} onChange={onChange} fullWidth multiline minRows={3} size={window.innerWidth < 600 ? 'small' : 'medium'} /></Grid>
          <Grid item xs={12}><TextField label="AI Agent Configuration (optional)" name="aiAgent" value={form.aiAgent} onChange={onChange} fullWidth multiline minRows={4} helperText="Enter AI assistant configuration in JSON format" placeholder='{"model": "gpt-4", "specialization": "cardiology", "capabilities": ["diagnosis", "treatment_plans"]}' size={window.innerWidth < 600 ? 'small' : 'medium'}/></Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{mt:3}}>
          <Button variant="contained" size="large" type="submit" disabled={loading} sx={{fontSize:{xs:'0.85rem', sm:'0.875rem'}}}>{loading? 'Saving...':'Register Doctor'}</Button>
        </Stack>
      </Box>
    </Paper>
  );
}
