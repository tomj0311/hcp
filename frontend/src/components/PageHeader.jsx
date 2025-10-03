import React from 'react';
import { Stack, Typography, IconButton, Box } from '@mui/material';
import { ArrowLeft as ArrowBackIcon } from 'lucide-react';

/**
 * PageHeader
 * Consistent page header with optional back button, subtitle, and actions.
 * - title: string | node
 * - subtitle: string | node (optional)
 * - onBack: () => void (optional)
 * - actions: node (optional, rendered on the right)
 * - mb: number | object (optional marginBottom, default 2)
 */
export default function PageHeader({ title, subtitle, onBack, actions, mb = 2 }){
  return (
    <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" sx={{ mb }}>
      {onBack && (
        <IconButton aria-label="back" onClick={onBack} size="large">
          <ArrowBackIcon />
        </IconButton>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography component="div" sx={{ mt: 0.25, opacity: 0.8, fontSize: { xs: '0.85rem', sm: '0.95rem' }, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {actions}
    </Stack>
  );
}
