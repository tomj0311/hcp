import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Tooltip, Chip, Autocomplete, Divider, Snackbar, Alert } from '@mui/material';
import { Plus as AddIcon, Video as VideoIcon } from 'lucide-react';
import axios from 'axios';
import dayjs from 'dayjs';

// Simple month grid calendar (no external heavy calendar lib)
function buildMonth(year, month){
  const first = dayjs(new Date(year, month, 1));
  const start = first.startOf('week');
  const days = [];
  let cur = start;
  for(let i=0;i<42;i++){
    days.push(cur);
    cur = cur.add(1,'day');
  }
  return days;
}

export default function Meetups({ auth }){
  const [events,setEvents] = useState([]);
  const [loading,setLoading] = useState(false);
  const [month,setMonth] = useState(dayjs());
  const monthDays = useMemo(()=> buildMonth(month.year(), month.month()), [month]);
  const [open,setOpen] = useState(false);
  const [form,setForm] = useState({ targetUserId:'', start:'', end:'', title:'', description:'' }); // start/end stored as ISO strings
  const [detail,setDetail] = useState(null);
  const [targets,setTargets] = useState([]); // Providers when consumer; consumers when provider
  const [loadingTargets,setLoadingTargets] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [viewMode,setViewMode] = useState('month'); // 'month' | 'week'
  const [selectedDate,setSelectedDate] = useState(dayjs());
  const location = useLocation();
  const navigate = useNavigate();

  const load = async ()=>{
    setLoading(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/meetups');
      setEvents(res.data);
    } finally { setLoading(false);} }

  useEffect(()=>{ load(); },[]);

  // Load selectable target users (providers for consumers; consumers for providers)
  const loadTargets = useCallback(async ()=>{
    if(!auth?.role || !['consumer','provider'].includes(auth.role)) return;
    setLoadingTargets(true);
    try {
  const route = auth.role === 'consumer'? '/users/providers' : '/users/consumers';
  const res = await axios.get(import.meta.env.VITE_API_URL + route);
      // Normalize to { id, name }
      const list = (res.data||[]).map(u=> ({ id:u.id, name: u.name || u.firstName || 'Unnamed'}));
      setTargets(list);
    } catch(e){ /* silent */ }
    finally { setLoadingTargets(false); }
  },[auth?.role, auth?.token]);

  useEffect(()=>{ loadTargets(); },[loadTargets]);

  // If navigated with a pre-selected provider/consumer, auto-open the dialog
  useEffect(()=>{
    const target = location.state?.newMeetupFor;
    if(target) {
      setForm(f=> ({...f, targetUserId: target.id }));
      setOpen(true);
    }
  // Only run on first mount with potential state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventsByDay = useMemo(()=>{
    const map = {};
    events.forEach(e=>{
      const d = dayjs(e.start).format('YYYY-MM-DD');
      (map[d] ||= []).push(e);
    });
    return map;
  },[events]);

  // Events in current selected week
  const weekStart = useMemo(()=> selectedDate.startOf('week'), [selectedDate]);
  const weekDays = useMemo(()=> Array.from({length:7},(_,i)=> weekStart.add(i,'day')), [weekStart]);
  const weekEvents = useMemo(()=>{
    const start = weekStart.startOf('day');
    const end = weekStart.add(7,'day');
    return events.filter(e=> dayjs(e.start).isAfter(start.subtract(1,'minute')) && dayjs(e.start).isBefore(end));
  },[events, weekStart]);
  const hours = useMemo(()=> Array.from({length:16},(_,i)=> 6+i), []); // 06:00 - 21:00

  const submit = async ()=>{
    if(!form.targetUserId || !form.start || !form.end) return;
    const payload = { ...form };
    try {
      console.debug('[meetups] submitting', payload);
  const res = await axios.post(import.meta.env.VITE_API_URL + '/meetups', payload);
      setEvents(ev=> [...ev, res.data]);
      setSuccess('Meetup created');
      setOpen(false);
      setForm({ targetUserId:'', start:'', end:'', title:'', description:'' });
    } catch(e){
      console.error('[meetups] create error', e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Failed to create meetup';
      setError(msg);
    }
  };

  // Helpers for datetime-local binding
  const setStartLocal = (val)=>{
    const iso = dayjs(val).isValid()? dayjs(val).toDate().toISOString(): '';
    setForm(f=> ({...f, start: iso, end: (f.end && dayjs(f.end).isAfter(iso))? f.end : (iso? dayjs(iso).add(30,'minute').toDate().toISOString(): '') }));
  };
  const setEndLocal = (val)=>{
    const iso = dayjs(val).isValid()? dayjs(val).toDate().toISOString(): '';
    setForm(f=> ({...f, end: iso }));
  };

  const openNewForDay = (day)=>{
    // Prefill start at 09:00 local, end +30m
    const base = day.hour(9).minute(0).second(0).millisecond(0);
    setForm(f=> ({...f, start: base.toDate().toISOString(), end: base.add(30,'minute').toDate().toISOString()}));
    setOpen(true);
  };

  const counterpartLabel = auth?.role === 'consumer'? 'Provider' : 'Consumer';
  const isValid = form.targetUserId && form.start && form.end && dayjs(form.end).isAfter(form.start);

  const findCounterpart = (ev)=>{
    if(!ev) return null;
    const counterpartId = auth?.role === 'consumer' ? ev.participantId : (ev.requesterRole === 'consumer'? ev.requesterId : ev.participantId);
    return targets.find(t=> t.id === counterpartId) || null;
  };
  const joinMeeting = (ev)=>{
    if(!ev) return;
    
    const cp = findCounterpart(ev); // counterpart (other party)
    // Determine providerId from event (independent of counterpart availability)
    const providerId = ev.requesterRole === 'provider'
      ? ev.requesterId
      : (ev.participantRole === 'provider' ? ev.participantId : null);
      
    if(auth?.role === 'consumer'){
      // For consumer, counterpart should be provider; if targets not yet loaded, fallback to providerId
      if(!providerId) {
        console.error('[Meetups] No providerId found for consumer navigation');
        return;
      }
      navigate(`/consult/${providerId}`,
        { state:{ provider: cp && ev.participantRole === 'provider' || ev.requesterRole === 'provider'? cp : (cp? cp : { id: providerId }), meetupId: ev.id } });
    } else if(auth?.role === 'provider') {
      if(!providerId) {
        console.error('[Meetups] No providerId found for provider navigation');
        return;
      }
      // Provider navigates with own providerId; no provider object passed so Consultation fetches it
      navigate(`/consult/${providerId}`, { state:{ meetupId: ev.id } });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:2}}>
        <Typography variant="h6" sx={{fontWeight:700}}>Meetups</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {viewMode==='month' && (
            <>
              <Button size="small" variant="outlined" onClick={()=> { setMonth(m=> m.subtract(1,'month')); setSelectedDate(d=> d.subtract(1,'month')); }}>Prev</Button>
              <Button size="small" variant="outlined" onClick={()=> { setMonth(m=> m.add(1,'month')); setSelectedDate(d=> d.add(1,'month')); }}>Next</Button>
            </>
          )}
          {viewMode==='week' && (
            <>
              <Button size="small" variant="outlined" onClick={()=> setSelectedDate(d=> d.subtract(1,'week'))}>Prev</Button>
              <Button size="small" variant="outlined" onClick={()=> setSelectedDate(d=> d.add(1,'week'))}>Next</Button>
            </>
          )}
          <Button size="small" variant={viewMode==='month'?'contained':'outlined'} onClick={()=> setViewMode('month')}>Month</Button>
          <Button size="small" variant={viewMode==='week'?'contained':'outlined'} onClick={()=> setViewMode('week')}>Week</Button>
          {(auth?.role==='consumer' || auth?.role==='provider') && (
            <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={()=> setOpen(true)}>New</Button>
          )}
        </Stack>
      </Stack>
      {viewMode==='month' && (
        <>
          <Typography variant="subtitle2" sx={{mb:1}}>{month.format('MMMM YYYY')}</Typography>
          <Box sx={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:0.5}}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <Box key={d} sx={{fontSize:12, fontWeight:600, textAlign:'center', opacity:0.7}}>{d}</Box>)}
            {monthDays.map(d=>{
              const key = d.format('YYYY-MM-DD');
              const inMonth = d.month() === month.month();
              const dayEvents = eventsByDay[key] || [];
              const isToday = d.isSame(dayjs(),'day');
              return (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{
                    p:0.5,
                    minHeight:90,
                    bgcolor: inMonth? 'background.paper':'action.hover',
                    position:'relative',
                    cursor:'pointer',
                    border: isToday ? '2px solid' : undefined,
                    borderColor: isToday ? 'primary.main' : undefined
                  }}
                  onClick={()=> { setSelectedDate(d); }}
                  onDoubleClick={()=> { if(inMonth){ openNewForDay(d); setSelectedDate(d); setViewMode('week'); } }}
                  title={inMonth? 'Click select / Double-click open day & switch to week' : ''}
                >
                  <Typography variant="caption" sx={{fontSize:10, fontWeight:600, opacity:0.75}}>{d.date()}</Typography>
                  <Box sx={{display:'flex', flexDirection:'column', gap:0.25, mt:0.25}}>
                    {dayEvents.slice(0,3).map(ev=> (
                      <Tooltip key={ev.id} title={ev.title}>
                        <Chip size="small" label={dayjs(ev.start).format('HH:mm')} color={ev.status==='cancelled'? 'default':'primary'} onClick={()=> setDetail(ev)} sx={{height:18, '& .MuiChip-label':{px:0.5, fontSize:10}}} />
                      </Tooltip>
                    ))}
                    {dayEvents.length>3 && <Typography variant="caption" sx={{fontSize:9, mt:0.25}}>+{dayEvents.length-3} more</Typography>}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </>
      )}

      {viewMode==='week' && (
        <Box>
          <Typography variant="subtitle2" sx={{mb:1}}>{weekStart.format('MMM D')} - {weekStart.add(6,'day').format('MMM D, YYYY')}</Typography>
          <Box sx={{display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', border: '1px solid', borderColor:'divider', height:600, position:'relative', overflow:'hidden', borderRadius:(t)=> t.custom?.radii?.card || 4}}>
            {/* Hour labels */}
            <Box sx={{borderRight:'1px solid', borderColor:'divider', position:'relative'}}>
              {hours.map(h=> (
                <Box key={h} sx={{position:'absolute', top: ((h-6)/16)*100+'%', fontSize:10, transform:'translateY(-6px)', pl:0.5}}>{String(h).padStart(2,'0')}:00</Box>
              ))}
            </Box>
            {weekDays.map(day=>{
              const key = day.format('YYYY-MM-DD');
              const dayEvents = eventsByDay[key] || [];
              const isToday = day.isSame(dayjs(),'day');
              return (
                <Box key={key} sx={{borderLeft:'1px solid', borderColor:'divider', position:'relative', bgcolor:isToday? 'action.hover':'transparent'}} onDoubleClick={()=> openNewForDay(day)}>
                  <Box sx={{position:'sticky', top:0, bgcolor:isToday? 'primary.main':'background.paper', color:isToday? 'primary.contrastText':'text.primary', fontSize:12, textAlign:'center', py:0.5, fontWeight:600}}>
                    {day.format('ddd D')}
                  </Box>
                  {dayEvents.map(ev=>{
                    const start = dayjs(ev.start);
                    const end = dayjs(ev.end);
                    const dayStart = day.hour(6).minute(0);
                    const dayEnd = day.hour(22).minute(0);
                    if(end.isBefore(dayStart) || start.isAfter(dayEnd)) return null;
                    const topRatio = Math.max(0, start.diff(dayStart,'minute') / (16*60));
                    const endClamped = end.isAfter(dayEnd)? dayEnd : end;
                    const heightRatio = Math.max(0.05, endClamped.diff(start,'minute') / (16*60));
                    return (
                      <Tooltip title={ev.title} key={ev.id}>
                        <Paper
                          elevation={3}
                          onClick={()=> setDetail(ev)}
                          sx={{
                            position:'absolute',
                            left:4,
                            right:4,
                            top: `${topRatio*100}%`,
                            height: `${heightRatio*100}%`,
                            bgcolor: ev.status==='cancelled'? 'action.disabledBackground':'primary.light',
                            color:'primary.contrastText',
                            p:0.5,
                            overflow:'hidden',
                            cursor:'pointer'
                          }}
                        >
                          <Typography noWrap sx={{fontSize:11, fontWeight:600}}>{start.format('HH:mm')} {ev.title}</Typography>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                  {/* Hour grid lines */}
                  {hours.map(h=> (
                    <Box key={h} sx={{position:'absolute', top: ((h-6)/16)*100+'%', left:0, right:0, borderTop:'1px dashed', borderColor:'divider'}} />
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Dialog open={open} onClose={()=> setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Meetup</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{mt:1}}>
            {['consumer','provider'].includes(auth?.role) && (
              <Autocomplete
                size="small"
                options={targets}
                loading={loadingTargets}
                getOptionLabel={(o)=> o.name || ''}
                value={targets.find(t=> t.id === form.targetUserId) || null}
                onChange={(e,val)=> setForm(f=> ({...f, targetUserId: val? val.id: ''}))}
                renderInput={(params)=>(<TextField {...params} label={`${counterpartLabel}`} placeholder={`Select a ${counterpartLabel.toLowerCase()}`} />)}
                noOptionsText={`No ${counterpartLabel.toLowerCase()}s`}
              />
            )}
            <Stack direction={{xs:'column', sm:'row'}} spacing={2}>
              <TextField
                label="Start"
                type="datetime-local"
                size="small"
                fullWidth
                value={form.start? dayjs(form.start).format('YYYY-MM-DDTHH:mm'): ''}
                onChange={e=> setStartLocal(e.target.value)}
                InputLabelProps={{ shrink:true }}
              />
              <TextField
                label="End"
                type="datetime-local"
                size="small"
                fullWidth
                value={form.end? dayjs(form.end).format('YYYY-MM-DDTHH:mm'): ''}
                onChange={e=> setEndLocal(e.target.value)}
                InputLabelProps={{ shrink:true }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={()=> setForm(f=> ({...f, end: f.start? dayjs(f.start).add(30,'minute').toDate().toISOString(): f.end}))}>+30m</Button>
              <Button size="small" variant="outlined" onClick={()=> setForm(f=> ({...f, end: f.start? dayjs(f.start).add(60,'minute').toDate().toISOString(): f.end}))}>+1h</Button>
              <Button size="small" variant="outlined" onClick={()=> setForm(f=> ({...f, end: f.start? dayjs(f.start).add(90,'minute').toDate().toISOString(): f.end}))}>+1.5h</Button>
              <Button size="small" variant="outlined" onClick={()=> setForm(f=> ({...f, end: f.start? dayjs(f.start).add(120,'minute').toDate().toISOString(): f.end}))}>+2h</Button>
            </Stack>
            <Divider flexItem />
            <TextField label="Title" value={form.title} onChange={e=> setForm(f=> ({...f,title:e.target.value}))} size="small" placeholder="e.g. Initial Consultation" />
            <TextField label="Description" multiline minRows={3} value={form.description} onChange={e=> setForm(f=> ({...f,description:e.target.value}))} size="small" placeholder="Goals, notes, agenda..." />
            {!isValid && <Typography variant="caption" color="error">Select a {counterpartLabel.toLowerCase()} and valid start/end times.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setOpen(false)}>Cancel</Button>
          <Button onClick={submit} variant="contained" disabled={!isValid}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detail} onClose={()=> setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {detail?.title || 'Meetup Details'}
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                  Meeting Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Start:</strong> {dayjs(detail.start).format('YYYY-MM-DD HH:mm')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>End:</strong> {dayjs(detail.end).format('YYYY-MM-DD HH:mm')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {dayjs(detail.end).diff(dayjs(detail.start), 'minute')} minutes
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Status:</strong>
                    </Typography>
                    <Chip 
                      label={detail.status} 
                      size="small" 
                      color={detail.status === 'scheduled' ? 'success' : detail.status === 'cancelled' ? 'error' : 'default'}
                    />
                  </Box>
                </Stack>
              </Box>
              
              {findCounterpart(detail) && (
                <Box>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Participants
                  </Typography>
                  <Typography variant="body2">
                    <strong>{counterpartLabel}:</strong> {findCounterpart(detail).name}
                  </Typography>
                </Box>
              )}
              
              {detail.description && (
                <Box>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    Description
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={(theme)=> ({ whiteSpace:'pre-wrap', bgcolor: theme.palette.background.paper, p: 1, borderRadius: 1 })}
                  >
                    {detail.description}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="caption" sx={{opacity:0.7}}>
                  Meeting ID: {detail.id}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {(auth?.role==='consumer' || auth?.role==='provider') && detail && (
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<VideoIcon />}
              onClick={()=> joinMeeting(detail)}
              sx={{ fontWeight: 600 }}
            >
              Go to Meeting Room
            </Button>
          )}
          <Button onClick={()=> setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={()=> setError('')} anchorOrigin={{ vertical:'bottom', horizontal:'center'}}>
        <Alert severity="error" onClose={()=> setError('')} variant="filled">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={()=> setSuccess('')} anchorOrigin={{ vertical:'bottom', horizontal:'center'}}>
        <Alert severity="success" onClose={()=> setSuccess('')} variant="filled">{success}</Alert>
      </Snackbar>
    </Box>
  );
}
