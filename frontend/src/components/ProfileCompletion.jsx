import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Stack, 
  Alert, 
  Grid, 
  LinearProgress,
  Box,
  Chip
} from '@mui/material';
import { CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function ProfileCompletion({ auth, onProfileUpdate }) {
  const [profile, setProfile] = useState({});
  const [completeness, setCompleteness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchCompleteness();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/profile/profile`
      );
      setProfile(res.data);
    } catch (error) {
      setStatus('Error loading profile');
    }
  };

  const fetchCompleteness = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/profile/profile/completeness`
      );
      setCompleteness(res.data);
    } catch (error) {
      console.error('Error fetching completeness:', error);
    }
  };

  const handleChange = (e) => {
    setProfile(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/profile/profile`,
        profile
      );
      
      setProfile(res.data);
      await fetchCompleteness();
      setStatus('Profile updated successfully!');
      
      if (onProfileUpdate) {
        onProfileUpdate(res.data);
      }
    } catch (error) {
      setStatus(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (!completeness) {
    return <LinearProgress />;
  }

  const isProvider = auth.role === 'provider';

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Complete Your Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {profile.authProvider === 'google' && (
              <Chip 
                icon={<CheckCircle size={16} />} 
                label="Signed up with Google" 
                color="success" 
                size="small" 
                sx={{ mr: 1, mb: 1 }}
              />
            )}
            Help us provide better service by completing your profile.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Profile Completion: {completeness.completionPercentage}%
              </Typography>
              {completeness.isComplete && (
                <CheckCircle size={20} color="green" />
              )}
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completeness.completionPercentage} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {completeness.missingFields.length > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Missing fields: {completeness.missingFields.join(', ')}
              </Typography>
            </Alert>
          )}
        </Box>

        {status && (
          <Alert 
            severity={status.includes('Error') ? 'error' : 'success'}
            sx={{ mb: 2 }}
          >
            {status}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="firstName"
                label="First Name"
                value={profile.firstName || ''}
                onChange={handleChange}
                fullWidth
                required
                error={completeness.missingFields.includes('firstName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="lastName"
                label="Last Name"
                value={profile.lastName || ''}
                onChange={handleChange}
                fullWidth
                required
                error={completeness.missingFields.includes('lastName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                value={profile.email || ''}
                disabled
                fullWidth
                helperText="Email cannot be changed"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone"
                label="Phone"
                value={profile.phone || ''}
                onChange={handleChange}
                fullWidth
                required
                error={completeness.missingFields.includes('phone')}
              />
            </Grid>

            {isProvider && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="organization"
                    label="Organization"
                    value={profile.organization || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={completeness.missingFields.includes('organization')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="specialization"
                    label="Specialization"
                    value={profile.specialization || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={completeness.missingFields.includes('specialization')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="bio"
                    label="Bio"
                    value={profile.bio || ''}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Tell us about your expertise and experience..."
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                Address (Optional)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="address1"
                label="Address Line 1"
                value={profile.address1 || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="city"
                label="City"
                value={profile.city || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="state"
                label="State/Region"
                value={profile.state || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="country"
                label="Country"
                value={profile.country || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
            
            {completeness.isComplete && (
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/dashboard'}
                size="large"
              >
                Continue to Dashboard
              </Button>
            )}
          </Box>
        </form>
      </Stack>
    </Paper>
  );
}
