import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Paper, Stack, IconButton, Switch, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RefreshCw as RefreshIcon } from 'lucide-react';
import ProviderCard from './ProviderCard.jsx';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function Dashboard({ token, onRequestConsult, mode, onToggleMode, role }){
  const [providers,setProviders] = useState([]);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  const loadProviders = async ()=>{
    try {
  const res = await axios.get(import.meta.env.VITE_API_URL + '/users/providers');
      setProviders(res.data.sort((a,b)=> b.rank - a.rank).slice(0,12));
    } catch (error) {
      console.error('Error loading providers:', error);
      // Error handling is now done by the axios interceptor
    }
  };

  useEffect(()=>{ loadProviders(); },[]);

  useEffect(()=>{
    const url = new URL(import.meta.env.VITE_WS_URL);
    if(token){
      url.searchParams.set('token', token);
    }
    wsRef.current = new WebSocket(url.toString());
    wsRef.current.onmessage = (e)=>{
      const data = JSON.parse(e.data);
      if(data.type==='consult_request'){
        // handle incoming consult request
        console.log('Consult request', data);
      }
    };
    return ()=> wsRef.current?.close();
  },[]);

  return (
    <Box sx={{px:{xs:1, sm:0}}}>
      <PageHeader
        title={`CONSULTFLOW — ${role==='consumer' ? 'Consumer Dashboard' : role==='provider' ? 'Provider Dashboard' : 'Admin Dashboard'}`}
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{fontSize:{xs:'0.7rem', sm:'0.75rem'}}}>{mode==='dark'? 'Dark':'Light'} mode</Typography>
            <Switch checked={mode==='dark'} onChange={onToggleMode} inputProps={{'aria-label':'toggle theme'}} size="small" />
            <IconButton aria-label="refresh" onClick={loadProviders} size="small"><RefreshIcon /></IconButton>
          </Stack>
        )}
        mb={{ xs: 2, sm: 3 }}
      />
      {role==='admin' && (
        <Grid container spacing={{xs:2, sm:3}} sx={{mb:3}}>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper sx={({palette,custom})=>({p:{xs:2, sm:3}, height:{xs:180, sm:220}, display:'flex', flexDirection:'column', justifyContent:'space-between', background:custom.tiles.image.bg, color:custom.tiles.image.fg, boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <div>
                <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Providers</Typography>
                <Typography variant="body2" sx={{opacity:0.9, fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Browse & manage top ranked providers.</Typography>
              </div>
              <Stack direction={{xs:'column', sm:'row'}} spacing={1}>
                <Button variant="contained" color="inherit" size="small" onClick={() => navigate('/register/provider')} sx={(theme)=>({
                  color: theme.palette.mode==='dark'? 'text.primary' : 'text.primary',
                  bgcolor: theme.palette.mode==='dark'? 'background.paper' : 'common.white',
                  opacity: 0.9,
                  '&:hover':{bgcolor: theme.palette.mode==='dark'? 'background.paper' : 'common.white', opacity: 1},
                  fontSize:{xs:'0.75rem', sm:'0.875rem'}
                })}>Add Provider</Button>
                <Button variant="outlined" color="inherit" size="small" onClick={loadProviders} sx={(theme)=>({
                  borderColor: theme.palette.common.white,
                  color: theme.palette.common.white,
                  opacity: 0.9,
                  fontSize:{xs:'0.75rem', sm:'0.875rem'}
                })}>Refresh</Button>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper sx={({custom})=>({p:{xs:2, sm:3}, height:{xs:180, sm:220}, background:custom.tiles.storytelling.bg, color:custom.tiles.storytelling.fg, display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <div>
                <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Consumers</Typography>
                <Typography variant="body2" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Onboard new consumers & verify accounts.</Typography>
              </div>
              <Button variant="contained" size="small" onClick={() => navigate('/register/consumer')} sx={{alignSelf:'flex-start', fontSize:{xs:'0.75rem', sm:'0.875rem'}}}>Register Consumer</Button>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={({custom})=>({p:{xs:2, sm:3}, height:{xs:180, sm:220}, background:custom.tiles.accentA.bg, color:custom.tiles.accentA.fg, display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <div>
                <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Insights</Typography>
                <Typography variant="body2" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Analytics & usage metrics (coming soon).</Typography>
              </div>
              <Button variant="outlined" color="inherit" size="small" disabled sx={{fontSize:{xs:'0.75rem', sm:'0.875rem'}}}>View Metrics</Button>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{p:{xs:1.5, sm:2}}}>
              <Typography variant="subtitle1" sx={{fontWeight:600, mb:1, fontSize:{xs:'1rem', sm:'1.125rem'}}}>Top Providers</Typography>
              <Grid container spacing={{xs:1.5, sm:2}} aria-label="provider list">
                {providers.map(d => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={d.id}>
                    <ProviderCard provider={d} onSelect={()=> onRequestConsult(d)} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
  {role==='consumer' && (
        <Grid container spacing={{xs:2, sm:3}}>
          <Grid item xs={12} md={6}>
            <Paper sx={({custom})=>({p:{xs:2, sm:3}, mb:{xs:2, sm:3}, background:custom.tiles.image.bg, color:custom.tiles.image.fg, boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Find a Provider</Typography>
              <Typography variant="body2" sx={{opacity:0.9, fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Tap a provider card to schedule a meetup.</Typography>
              <Button variant="contained" size="small" sx={(theme)=>({
                mt:2,
                color: theme.palette.text.primary,
                bgcolor: theme.palette.mode==='dark'? 'background.paper' : 'common.white',
                opacity: 0.9,
                '&:hover':{bgcolor: theme.palette.mode==='dark'? 'background.paper' : 'common.white', opacity: 1},
                fontSize:{xs:'0.75rem', sm:'0.875rem'}
              })} onClick={loadProviders}>Refresh List</Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={({custom})=>({p:{xs:2, sm:3}, background:custom.tiles.storytelling.bg, color:custom.tiles.storytelling.fg, boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Your Plan</Typography>
              <Typography variant="body2" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Upgrade to access more consultation credits.</Typography>
              <Button variant="outlined" size="small" onClick={() => navigate('/pricing')} sx={{mt:2, fontSize:{xs:'0.75rem', sm:'0.875rem'}}}>View Plans</Button>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{p:{xs:1.5, sm:2}}}>
              <Typography variant="subtitle1" sx={{fontWeight:600, mb:1, fontSize:{xs:'1rem', sm:'1.125rem'}}}>Available Providers</Typography>
              <Grid container spacing={{xs:1.5, sm:2}} aria-label="provider list">
                {providers.map(d => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={d.id}>
                    <ProviderCard provider={d} onSelect={()=> onRequestConsult(d)} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
