import React, { useMemo, useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button, IconButton, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { buildTheme } from '../theme/theme.js';
import LoginForm from '../components/LoginForm.jsx';
import Dashboard from '../components/Dashboard.jsx';
import RegistrationForm from '../components/RegistrationForm.jsx';
import PatientRegistration from '../components/PatientRegistration.jsx';
import DoctorRegistration from '../components/DoctorRegistration.jsx';
import Pricing from '../components/Pricing.jsx';
import SideNav, { getDrawerWidth } from '../components/SideNav.jsx';
import Consultation from '../components/Consultation.jsx';
import AdminLogin from '../components/AdminLogin.jsx';

function ProtectedRoute({ auth, children }){
  if(!auth) return <Navigate to="/login" replace />;
  return children;
}
function AdminRoute({ auth, children }){
  if(!auth) return <Navigate to="/login" replace />;
  if(auth.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App(){
  const [auth,setAuth] = useState(null);
  const [mode,setMode] = useState('dark');
  const theme = useMemo(()=> buildTheme(mode), [mode]);
  const nav = useNavigate();

  // load from localStorage on mount
  useEffect(()=>{
    const saved = localStorage.getItem('hcp_auth');
    if(saved){
      try { setAuth(JSON.parse(saved)); } catch {}
    }
  },[]);

  const logout = ()=>{ setAuth(null); localStorage.removeItem('hcp_auth'); nav('/login'); };
  const requestConsult = (doctor)=>{
    nav(`/consult/${doctor.id}`, { state:{ doctor } });
  };

  const [navCollapsed,setNavCollapsed] = useState(()=>{
    const isMobile = window.innerWidth < 768;
    if (isMobile) return true; // Auto-collapse on mobile
    try { return localStorage.getItem('hcp_nav_collapsed') === '1'; } catch { return false; }
  });
  const drawerWidth = getDrawerWidth(navCollapsed);
  const showNav = auth && window.location.pathname !== '/login' && window.location.pathname !== '/adminLogin' && window.location.pathname !== '/signup';
  const isMobile = window.innerWidth < 768;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: theme.palette.mode==='dark'? '1px solid #333':'1px solid #e0e0e0',
          // Keep fully transparent background (no solid fill)
          ml: showNav && !isMobile? `${drawerWidth}px`:0,
          width: showNav && !isMobile? `calc(100% - ${drawerWidth}px)`:'100%',
          borderRadius: 0,
          zIndex: theme.zIndex.drawer + 2,
          backdropFilter: 'saturate(180%) blur(8px)'
        }}
      >
        <Toolbar sx={{minHeight:{xs:56, sm:64}}}>
          {showNav && (
            <Tooltip title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <IconButton 
                edge="start" 
                onClick={() => setNavCollapsed(c => { 
                  const next = !c; 
                  try { localStorage.setItem('hcp_nav_collapsed', next ? '1' : '0'); } catch {} 
                  return next; 
                })}
                sx={{ mr: 2 }}
                aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                {navCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1.1rem', sm:'1.25rem'}}}>HealthCare Platform</Typography>
          <Box sx={{flexGrow:1}} />
          {!auth && <Button component={Link} to="/login" color="inherit" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Patient Login</Button>}
          {!auth && <Button component={Link} to="/adminLogin" color="inherit" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Admin Login</Button>}
          {auth && <Button onClick={logout} color="inherit" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Logout</Button>}
        </Toolbar>
    </AppBar>
    {/* Spacer to offset the fixed AppBar height so content never slides underneath */}
    <Toolbar sx={{ minHeight:{xs:56, sm:64}, mb: 0 }} />
  {showNav && <SideNav role={auth?.role} onLogout={logout} collapsed={navCollapsed} />}
  <Box component="main" sx={{ flexGrow:1, ml: showNav && !isMobile? `${drawerWidth}px`:0, px:{xs:1, sm:2, md:3}, pt:{xs:3, sm:4, md:5}, pb:{xs:3, md:6}, transition:'margin-left .25s ease', position:'relative', zIndex: 0 }}>
        <Routes>
          <Route path="/" element={<ProtectedRoute auth={auth}><Dashboard token={auth?.token} role={auth?.role} mode={mode} onToggleMode={()=> setMode(m=> m==='dark'?'light':'dark')} onRequestConsult={requestConsult} /></ProtectedRoute>} />
          <Route path="/login" element={auth? <Navigate to="/" replace />:<LoginForm onLogin={data=> { setAuth(data); localStorage.setItem('hcp_auth', JSON.stringify(data)); nav('/'); }} />} />
          <Route path="/adminLogin" element={auth? <Navigate to="/" replace />:<AdminLogin onLogin={data=> { setAuth(data); localStorage.setItem('hcp_auth', JSON.stringify(data)); nav('/'); }} />} />
          <Route path="/signup" element={auth? <Navigate to="/" replace />:<PatientRegistration />} />
          <Route path="/register" element={<AdminRoute auth={auth}><RegistrationForm /></AdminRoute>} />
          <Route path="/register/patient" element={<AdminRoute auth={auth}><PatientRegistration /></AdminRoute>} />
          <Route path="/register/doctor" element={<AdminRoute auth={auth}><DoctorRegistration /></AdminRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/consult/:id" element={<ProtectedRoute auth={auth}><Consultation /></ProtectedRoute>} />
          <Route path="*" element={<Typography>Not Found</Typography>} />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}
