import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Stack, Alert, Grid, Divider } from '@mui/material';
import axios from 'axios';
import GoogleAuthButton from './GoogleAuthButton.jsx';

export default function ConsumerRegistration({ admin=false, token }){
  const [form,setForm] = useState({ firstName:'', lastName:'', email:'', password:'', confirmPassword:'', phone:'', address1:'', address2:'', city:'', state:'', postalCode:'', country:'' });
  const [phase,setPhase] = useState('form');
  const [verifyToken,setVerifyToken] = useState('');
  const [enteredToken,setEnteredToken] = useState('');
  const [status,setStatus] = useState('');
  const [loading,setLoading] = useState(false);
  const onChange = e=> setForm(f=> ({...f, [e.target.name]: e.target.value}));
  const submit = async e => {
    e.preventDefault(); setLoading(true); setStatus('');
    try {
    if(admin){
  const res = await axios.post(import.meta.env.VITE_API_URL + '/users/consumers/admin', form);
        setStatus('Consumer created' + (res.data.tempPassword? ` (temp password: ${res.data.tempPassword})` : '')); setPhase('done');
      } else {
  const res = await axios.post(import.meta.env.VITE_API_URL + '/users/consumers', form);
        setVerifyToken(res.data.verifyToken); setStatus('Account created. Check email (dev token below).'); setPhase('verify');
      }
    } catch(err){ setStatus(err.response?.data?.message || 'Registration failed'); } finally { setLoading(false); }
  };
  const verify = async ()=>{
    if(!enteredToken.trim()) return; setLoading(true); setStatus('');
    try { await axios.post(import.meta.env.VITE_API_URL + '/users/consumers/verify', { token: enteredToken.trim() }); setPhase('done'); setStatus('Email verified! You can login now.'); }
    catch(err){ setStatus(err.response?.data?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };
  return (
  <Paper component="form" onSubmit={submit} sx={{p:{xs:3, sm:5}, maxWidth:900, width:'100%', mx:'auto', mt:{xs:2, sm:4}, borderRadius:(t)=> t.custom?.radii?.card || 4, boxShadow:(t)=> t.palette.mode==='dark'? '0 10px 40px -12px rgba(0,0,0,0.65)':'0 12px 42px -14px rgba(30,50,70,0.18)'}}>
      <Typography variant="h4" sx={{fontWeight:700, mb:1, fontSize:{xs:'1.7rem', sm:'2rem'}}}>{admin? 'Create Consumer':'Sign Up'}</Typography>
      <Typography variant="body2" sx={{mb:3, opacity:0.8}}>Create your consumer account to start requesting consultations.</Typography>
      {status && <Alert severity={status.toLowerCase().includes('fail')? 'error':'info'} sx={{mb:3}}>{status}</Alert>}
      {phase==='form' && (
        <>
          {!admin && (
            <>
              <GoogleAuthButton text="Sign up with Google" />
              
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  or sign up with email
                </Typography>
              </Divider>
            </>
          )}
          
          <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>Basic Information</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={12} sm={6}>
              <TextField name="firstName" label="First Name" value={form.firstName} onChange={onChange} required fullWidth autoComplete="given-name" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="lastName" label="Last Name" value={form.lastName} onChange={onChange} required fullWidth autoComplete="family-name" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="email" type="email" label="Email" value={form.email} onChange={onChange} required fullWidth autoComplete="email" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="phone" label="Phone" value={form.phone} onChange={onChange} fullWidth autoComplete="tel" placeholder="+1 555 123 4567" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="password" type="password" label="Password" value={form.password} onChange={onChange} required fullWidth helperText="Min 8 characters" autoComplete="new-password" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="confirmPassword" type="password" label="Confirm Password" value={form.confirmPassword} onChange={onChange} required fullWidth autoComplete="new-password" />
            </Grid>
          </Grid>
          <Divider sx={{my:3}} />
          <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>Address</Typography>
          <Grid container spacing={2} sx={{mb:3}}>
            <Grid item xs={12}>
              <TextField name="address1" label="Address Line 1" value={form.address1} onChange={onChange} fullWidth autoComplete="address-line1" />
            </Grid>
            <Grid item xs={12}>
              <TextField name="address2" label="Address Line 2" value={form.address2} onChange={onChange} fullWidth autoComplete="address-line2" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="city" label="City" value={form.city} onChange={onChange} fullWidth autoComplete="address-level2" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="state" label="State/Region" value={form.state} onChange={onChange} fullWidth autoComplete="address-level1" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="postalCode" label="Postal Code" value={form.postalCode} onChange={onChange} fullWidth autoComplete="postal-code" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="country" label="Country" value={form.country} onChange={onChange} fullWidth autoComplete="country" />
            </Grid>
          </Grid>
          <Stack direction={{xs:'column', sm:'row'}} spacing={2}>
            <Button type="submit" variant="contained" disabled={loading} size="large" sx={{minWidth:180}}>{loading? 'Saving...':'Create Account'}</Button>
            {!admin && <Button href="/login" type="button" variant="outlined" size="large">Back to Login</Button>}
          </Stack>
        </>
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
          <Typography variant="body2">Consumer account ready.</Typography>
          <Button href="/login" variant="contained">Go to Login</Button>
        </Stack>
      )}
    </Paper>
  );
}
