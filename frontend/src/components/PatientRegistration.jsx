import React, { useState } from 'react';
import { 
  Box, TextField, Button, Typography, Paper, Stepper, Step, StepLabel, 
  Grid, Alert, Chip, Stack, MenuItem, FormControl, InputLabel, Select, 
  FormHelperText, InputAdornment, IconButton, Checkbox, FormControlLabel,
  Divider, Card, CardContent
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Security } from '@mui/icons-material';
import axios from 'axios';

export default function PatientRegistration(){
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    password: '', 
    confirmPassword: '',
    dateOfBirth: '', 
    gender: '', 
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
    conditions: '',
    medications: '',
    allergies: '',
    insurance: '',
    termsAccepted: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [enteredToken, setEnteredToken] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f, 
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields validation
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.password) newErrors.password = 'Password is required';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!form.gender) newErrors.gender = 'Gender is required';
    if (!form.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (form.phone && !phoneRegex.test(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (form.password && form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Age validation (calculated from date of birth)
    if (form.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear();
      if (age < 0 || age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setStatus('Please correct the errors below');
      return;
    }

    setLoading(true); 
    setStatus(null);
    
    try {
      const payload = { 
        name: `${form.firstName} ${form.lastName}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email, 
        phone: form.phone,
        password: form.password, 
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: {
          street: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode
        },
        emergencyContact: {
          name: form.emergencyContact,
          phone: form.emergencyPhone
        },
        medicalInfo: {
          conditions: form.conditions.split(',').map(c => c.trim()).filter(Boolean),
          medications: form.medications.split(',').map(m => m.trim()).filter(Boolean),
          allergies: form.allergies.split(',').map(a => a.trim()).filter(Boolean),
          insurance: form.insurance
        }
      };
      
      const res = await axios.post(import.meta.env.VITE_API_URL + '/users/patients', payload);
      setVerifyToken(res.data.verifyToken);
      setStatus('Registration successful! Please check your email for verification instructions.');
      setStep(1);
    } catch(err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setStatus(errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  const verify = async () => {
    if (!enteredToken.trim()) {
      setStatus('Please enter the verification token');
      return;
    }

    setLoading(true); 
    setStatus(null);
    
    try {
      await axios.post(import.meta.env.VITE_API_URL + '/users/patients/verify', { 
        token: enteredToken.trim() 
      });
      setStatus('Email verified successfully! You can now log in to your account.');
      setStep(2);
    } catch(err) { 
      const errorMessage = err.response?.data?.message || 'Verification failed. Please check your token and try again.';
      setStatus(errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <Paper sx={{
      p: { xs: 3, md: 5 }, 
      maxWidth: 900, 
      mx: 'auto', 
      mt: { xs: 4, md: 6 }, 
      boxShadow: (theme) => theme.palette.mode === 'dark' 
        ? '0 6px 28px -8px rgba(0,0,0,0.7)' 
        : '0 6px 24px -8px rgba(0,0,0,0.1)'
    }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Patient Registration
      </Typography>
      
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Details</StepLabel>
        </Step>
        <Step>
          <StepLabel>Verify Email</StepLabel>
        </Step>
        <Step>
          <StepLabel>Complete</StepLabel>
        </Step>
      </Stepper>

      {status && (
        <Alert 
          severity={status.includes('failed') || status.includes('error') ? 'error' : 
                   status.includes('successful') || status.includes('verified') ? 'success' : 'info'} 
          sx={{ mb: 3 }}
        >
          {status}
        </Alert>
      )}

      {step === 0 && (
        <Box component="form" onSubmit={submit} noValidate>
          {/* Personal Information Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Personal Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="First Name" 
                    name="firstName" 
                    value={form.firstName} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Last Name" 
                    name="lastName" 
                    value={form.lastName} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Email" 
                    type="email" 
                    name="email" 
                    value={form.email} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.email}
                    helperText={errors.email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Phone Number" 
                    name="phone" 
                    value={form.phone} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.phone}
                    helperText={errors.phone}
                    placeholder="(555) 123-4567"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Date of Birth" 
                    type="date" 
                    name="dateOfBirth" 
                    value={form.dateOfBirth} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.dateOfBirth}
                    helperText={errors.dateOfBirth}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!errors.gender}>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      name="gender"
                      value={form.gender}
                      onChange={onChange}
                      label="Gender"
                    >
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                      <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                    </Select>
                    {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Account Security Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Account Security
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Password" 
                    type={showPassword ? 'text' : 'password'}
                    name="password" 
                    value={form.password} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.password}
                    helperText={errors.password || 'Minimum 8 characters'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Confirm Password" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword" 
                    value={form.confirmPassword} 
                    onChange={onChange} 
                    fullWidth 
                    required
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Address Information Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Address Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField 
                    label="Street Address" 
                    name="address" 
                    value={form.address} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="City" 
                    name="city" 
                    value={form.city} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="State/Province" 
                    name="state" 
                    value={form.state} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="ZIP/Postal Code" 
                    name="zipCode" 
                    value={form.zipCode} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Emergency Contact Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Emergency Contact
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Emergency Contact Name" 
                    name="emergencyContact" 
                    value={form.emergencyContact} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Emergency Contact Phone" 
                    name="emergencyPhone" 
                    value={form.emergencyPhone} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Medical Information Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Medical Information (Optional)
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField 
                    label="Existing Medical Conditions" 
                    name="conditions" 
                    value={form.conditions} 
                    onChange={onChange} 
                    fullWidth 
                    multiline 
                    minRows={2}
                    helperText="Separate multiple conditions with commas"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Current Medications" 
                    name="medications" 
                    value={form.medications} 
                    onChange={onChange} 
                    fullWidth 
                    multiline 
                    minRows={2}
                    helperText="Include dosage if known, separate with commas"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Allergies" 
                    name="allergies" 
                    value={form.allergies} 
                    onChange={onChange} 
                    fullWidth 
                    multiline 
                    minRows={2}
                    helperText="Include food, drug, and environmental allergies"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Insurance Provider" 
                    name="insurance" 
                    value={form.insurance} 
                    onChange={onChange} 
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="termsAccepted"
                  checked={form.termsAccepted}
                  onChange={onChange}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the Terms of Service and Privacy Policy, and consent to the collection and use of my medical information for healthcare purposes.
                </Typography>
              }
            />
            {errors.termsAccepted && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {errors.termsAccepted}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button 
              variant="contained" 
              type="submit" 
              disabled={loading}
              size="large"
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Stack>
        </Box>
      )}
      {step === 1 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Verify Your Email Address
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              We've sent a verification code to <strong>{form.email}</strong>. 
              Please enter the code below to activate your account.
            </Typography>
            
            <Box sx={{ maxWidth: 400, mx: 'auto' }}>
              <TextField 
                label="Verification Code" 
                value={enteredToken} 
                onChange={(e) => setEnteredToken(e.target.value)} 
                fullWidth
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="Enter 6-digit code"
                inputProps={{ 
                  style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }
                }}
              />
              
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button 
                  variant="contained" 
                  onClick={verify} 
                  disabled={loading || !enteredToken.trim()}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Button>
              </Stack>
              
              {verifyToken && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="warning.dark">
                    Development Mode - Use this token: 
                  </Typography>
                  <Chip 
                    label={verifyToken} 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Box>
              )}
              
              <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
                Didn't receive the code? Check your spam folder or contact support.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      {step === 2 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <Typography variant="h2" color="white">✓</Typography>
            </Box>
            
            <Typography variant="h4" gutterBottom color="success.main" sx={{ fontWeight: 600 }}>
              Registration Complete!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
              Welcome to our healthcare platform, <strong>{form.firstName}</strong>! 
              Your account has been successfully created and verified.
            </Typography>
            
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button 
                variant="contained" 
                size="large"
                href="/login"
                sx={{ minWidth: 150 }}
              >
                Sign In Now
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                href="/dashboard"
              >
                Go to Dashboard
              </Button>
            </Stack>
            
            <Typography variant="body2" sx={{ mt: 4, color: 'text.secondary' }}>
              You can now book appointments, access your medical records, and communicate with healthcare providers.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
}
