import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Paper, Stack, IconButton, Switch, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import ProviderCard from './ProviderCard.jsx';
import axios from 'axios';

export default function Dashboard({ token, onRequestConsult, mode, onToggleMode, role }){
  const [providers,setProviders] = useState([]);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  const loadProviders = async ()=>{
    const res = await axios.get(import.meta.env.VITE_API_URL + '/users/providers', { headers:{ Authorization:`Bearer ${token}` }});
    setProviders(res.data.sort((a,b)=> b.rank - a.rank).slice(0,12));
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
      <Stack direction={{xs:'column', sm:'row'}} justifyContent="space-between" alignItems={{xs:'flex-start', sm:'center'}} spacing={{xs:2, sm:0}} sx={{mb:3}}>
          <Typography variant="h5" sx={{fontWeight:700, fontSize:{xs:'1.25rem', sm:'1.5rem'}}}>{role==='consumer'? 'Consumer Dashboard':'Admin Dashboard'}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{fontSize:{xs:'0.7rem', sm:'0.75rem'}}}>{mode==='dark'? 'Dark':'Light'} mode</Typography>
          <Switch checked={mode==='dark'} onChange={onToggleMode} inputProps={{'aria-label':'toggle theme'}} size="small" />
          <IconButton aria-label="refresh" onClick={loadProviders} size="small"><RefreshIcon /></IconButton>
        </Stack>
      </Stack>
      {role==='admin' && (
        <Grid container spacing={{xs:2, sm:3}} sx={{mb:3}}>
          <Grid item xs={12} sm={6} lg={4}>
            <Paper sx={({palette,custom})=>({p:{xs:2, sm:3}, height:{xs:180, sm:220}, display:'flex', flexDirection:'column', justifyContent:'space-between', background:custom.tiles.image.bg, color:custom.tiles.image.fg, boxShadow:'0 6px 26px -10px rgba(0,0,0,0.35)'})}>
              <div>
                <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1rem', sm:'1.25rem'}}}>Providers</Typography>
                <Typography variant="body2" sx={{opacity:0.9, fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Browse & manage top ranked providers.</Typography>
              </div>
              <Stack direction={{xs:'column', sm:'row'}} spacing={1}>
                <Button variant="contained" color="inherit" size="small" onClick={() => navigate('/register/provider')} sx={{color:'black', bgcolor:'rgba(255,255,255,0.9)', '&:hover':{bgcolor:'white'}, fontSize:{xs:'0.75rem', sm:'0.875rem'}}}>Add Provider</Button>
                <Button variant="outlined" color="inherit" size="small" onClick={loadProviders} sx={{borderColor:'rgba(255,255,255,0.6)', color:'white', fontSize:{xs:'0.75rem', sm:'0.875rem'}}}>Refresh</Button>
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
              <Grid container spacing={{xs:1.5, sm:2}} aria-label="doctor list">
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
              <Typography variant="body2" sx={{opacity:0.9, fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Tap a provider card to request a session.</Typography>
              <Button variant="contained" size="small" sx={{mt:2, color:'black', bgcolor:'rgba(255,255,255,0.9)', '&:hover':{bgcolor:'white'}, fontSize:{xs:'0.75rem', sm:'0.875rem'}}} onClick={loadProviders}>Refresh List</Button>
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
              <Grid container spacing={{xs:1.5, sm:2}} aria-label="doctor list">
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
