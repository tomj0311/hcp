import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Paper, CircularProgress, Box, Alert } from '@mui/material';
import axios from 'axios';

export default function AuthCallback({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const name = searchParams.get('name');

    if (token && role) {
      // Successful OAuth login
      const userData = {
        token,
        role,
        name: decodeURIComponent(name || '')
      };
      
      onLogin(userData);
      
      // Check if profile is complete
      checkProfileCompleteness(userData);
    } else {
      // OAuth failed or was cancelled
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            error: 'Google authentication failed. Please try again.' 
          } 
        });
      }, 3000);
    }
  }, [searchParams, navigate, onLogin]);

  const checkProfileCompleteness = async (userData) => {
    setChecking(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/profile/profile/completeness`
      );
      
      if (!res.data.isComplete) {
        // Profile incomplete, redirect to completion page
        navigate('/profile/complete');
      } else {
        // Profile complete, redirect to dashboard
  navigate('/');
      }
    } catch (error) {
      console.error('Error checking profile completeness:', error);
      // On error, just redirect to dashboard
  navigate('/');
    } finally {
      setChecking(false);
    }
  };

  const token = searchParams.get('token');
  const isSuccess = !!token;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        px: 2
      }}
    >
      <Paper 
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          maxWidth: 400,
          borderRadius: 2
        }}
      >
        {isSuccess ? (
          <>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {checking ? 'Setting up your account...' : 'Authentication Successful'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {checking ? 'Checking your profile...' : 'Redirecting you to your dashboard...'}
            </Typography>
          </>
        ) : (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              Authentication failed
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting you back to login...
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
