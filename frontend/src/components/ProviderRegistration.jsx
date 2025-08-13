import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Stack, Alert, Grid, Divider } from '@mui/material';
import axios from 'axios';

export default function ProviderRegistration({ admin=false, token }){
  const [form,setForm] = useState({ firstName:'', lastName:'', email:'', password:'', confirmPassword:'', phone:'', organization:'', specialization:'', bio:'', address1:'', address2:'', city:'', state:'', postalCode:'', country:'' });
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
  <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:5}, maxWidth:1000, width:'100%', mx:'auto', mt:{xs:2, sm:4}, borderRadius:(t)=> t.custom?.radii?.card || 4, boxShadow:(t)=> t.palette.mode==='dark'? '0 10px 40px -12px rgba(0,0,0,0.65)':'0 12px 42px -14px rgba(30,50,70,0.18)'}}>
      <Typography variant="h4" sx={{fontWeight:700, mb:1, fontSize:{xs:'1.7rem', sm:'2rem'}}}>{admin? 'Create Provider':'Provider Registration'}</Typography>
      <Typography variant="body2" sx={{mb:3, opacity:0.8}}>Provide your professional details. Fields marked optional can be added later.</Typography>
      {status && <Alert severity={status.toLowerCase().includes('fail')? 'error':'info'} sx={{mb:3}}>{status}</Alert>}
      {phase==='form' && (
        <>
          <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>Profile</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={12} sm={6}><TextField name="firstName" label="First Name" value={form.firstName} onChange={onChange} required fullWidth autoComplete="given-name" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="lastName" label="Last Name" value={form.lastName} onChange={onChange} required fullWidth autoComplete="family-name" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="email" type="email" label="Email" value={form.email} onChange={onChange} required fullWidth autoComplete="email" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="phone" label="Phone" value={form.phone} onChange={onChange} fullWidth autoComplete="tel" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="password" type="password" label="Password (optional)" value={form.password} onChange={onChange} fullWidth helperText={form.password? 'Min 8 characters':'Leave blank to auto-generate'} autoComplete="new-password" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="confirmPassword" type="password" label="Confirm Password" value={form.confirmPassword} onChange={onChange} fullWidth autoComplete="new-password" /></Grid>
          </Grid>
          <Divider sx={{my:3}} />
          <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>Professional</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={12} sm={6}><TextField name="organization" label="Organization" value={form.organization} onChange={onChange} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField name="specialization" label="Specialization" value={form.specialization} onChange={onChange} fullWidth /></Grid>
            <Grid item xs={12}><TextField name="bio" label="Short Bio" value={form.bio} onChange={onChange} multiline minRows={3} fullWidth placeholder="Describe your expertise, experience, focus areas..." /></Grid>
          </Grid>
          <Divider sx={{my:3}} />
          <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>Address</Typography>
          <Grid container spacing={2} sx={{mb:3}}>
            <Grid item xs={12}><TextField name="address1" label="Address Line 1" value={form.address1} onChange={onChange} fullWidth autoComplete="address-line1" /></Grid>
            <Grid item xs={12}><TextField name="address2" label="Address Line 2" value={form.address2} onChange={onChange} fullWidth autoComplete="address-line2" /></Grid>
            <Grid item xs={12} sm={4}><TextField name="city" label="City" value={form.city} onChange={onChange} fullWidth autoComplete="address-level2" /></Grid>
            <Grid item xs={12} sm={4}><TextField name="state" label="State/Region" value={form.state} onChange={onChange} fullWidth autoComplete="address-level1" /></Grid>
            <Grid item xs={12} sm={4}><TextField name="postalCode" label="Postal Code" value={form.postalCode} onChange={onChange} fullWidth autoComplete="postal-code" /></Grid>
            <Grid item xs={12} sm={6}><TextField name="country" label="Country" value={form.country} onChange={onChange} fullWidth autoComplete="country" /></Grid>
          </Grid>
          <Stack direction={{xs:'column', sm:'row'}} spacing={2}>
            <Button type="submit" variant="contained" disabled={loading} size="large" sx={{minWidth:200}}>{loading? 'Saving...':'Register Provider'}</Button>
            {!admin && <Button href="/login" type="button" variant="outlined" size="large">Back to Login</Button>}
          </Stack>
        </>
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
