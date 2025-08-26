import React, { useMemo, useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button, IconButton } from '@mui/material';
import { Menu, PanelLeftClose } from 'lucide-react';
import { buildTheme } from '../theme/theme.js';
import LoginForm from '../components/LoginForm.jsx';
import Dashboard from '../components/Dashboard.jsx';
import ConsumerRegistration from '../components/ConsumerRegistration.jsx';
import ProviderRegistration from '../components/ProviderRegistration.jsx';
import Pricing from '../components/Pricing.jsx';
import SideNav, { getDrawerWidth } from '../components/SideNav.jsx';
import Consultation from '../components/Consultation.jsx';
import AdminLogin from '../components/AdminLogin.jsx';
import EmailVerify from '../components/EmailVerify.jsx';
import Meetups from '../components/Meetups.jsx';
import AuthCallback from '../components/AuthCallback.jsx';
import ProfileCompletion from '../components/ProfileCompletion.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { setupAxiosInterceptors } from '../utils/auth.js';

function ProtectedRoute({ auth, children }){
  console.log('[ProtectedRoute] auth state:', auth);
  if(!auth) {
    console.log('[ProtectedRoute] No auth, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  console.log('[ProtectedRoute] Auth valid, rendering children');
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

  // Initialize global axios auth interceptors once
  useEffect(() => {
    setupAxiosInterceptors(nav);
    // Clear in-memory auth state if a global logout is dispatched
    const onLogout = () => setAuth(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [nav]);

  // load from localStorage on mount
  useEffect(()=>{
    const saved = localStorage.getItem('hcp_auth');
    if(saved){
      try { setAuth(JSON.parse(saved)); } catch {}
    }
  },[]);

  const logout = ()=>{ setAuth(null); localStorage.removeItem('hcp_auth'); nav('/login'); };
  // When selecting a provider, redirect to Meetups page to schedule an event
  const requestConsult = (provider)=>{
    nav('/meetups', { state: { newMeetupFor: { id: provider.id, name: provider.name } } });
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
      borderBottom: '1px solid',
      borderColor: 'divider',
          // Keep fully transparent background (no solid fill)
          ml: showNav && !isMobile? `${drawerWidth}px`:0,
          width: showNav && !isMobile? `calc(100% - ${drawerWidth}px)`:'100%',
          borderRadius: 0, // This is intentionally 0 for full-width app bar
          zIndex: theme.zIndex.drawer + 2,
          backdropFilter: 'saturate(180%) blur(8px)'
        }}
      >
        <Toolbar sx={{minHeight:{xs:56, sm:64}}}>
          {showNav && (
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
              {navCollapsed ? <Menu size={20} /> : <PanelLeftClose size={20} />}
            </IconButton>
          )}
          <Typography variant="h6" sx={{fontWeight:700, fontSize:{xs:'1.1rem', sm:'1.25rem'}}}>ConsulFLOW</Typography>
          <Box sx={{flexGrow:1}} />
          {!auth && <Button component={Link} to="/login" color="inherit" sx={{fontSize:{xs:'0.8rem', sm:'0.875rem'}}}>Consumer Login</Button>}
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
          <Route path="/auth/callback" element={<AuthCallback onLogin={data=> { setAuth(data); localStorage.setItem('hcp_auth', JSON.stringify(data)); }} />} />
          <Route path="/adminLogin" element={auth? <Navigate to="/" replace />:<AdminLogin onLogin={data=> { setAuth(data); localStorage.setItem('hcp_auth', JSON.stringify(data)); nav('/'); }} />} />
          <Route path="/signup" element={auth? <Navigate to="/" replace />:<ConsumerRegistration />} />
          <Route path="/signup/provider" element={auth? <Navigate to="/" replace />:<ProviderRegistration />} />
          <Route path="/register/consumer" element={<AdminRoute auth={auth}><ConsumerRegistration admin token={auth?.token} /></AdminRoute>} />
          <Route path="/register/provider" element={<AdminRoute auth={auth}><ProviderRegistration admin token={auth?.token} /></AdminRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/consult/:id" element={<ProtectedRoute auth={auth}><Consultation /></ProtectedRoute>} />
          <Route path="/profile/complete" element={<ProtectedRoute auth={auth}><ProfileCompletion auth={auth} /></ProtectedRoute>} />
          <Route path="/meetups" element={<ProtectedRoute auth={auth}><Meetups auth={auth} /></ProtectedRoute>} />
          <Route path="/verify" element={<EmailVerify />} />
          <Route path="*" element={<Typography>Not Found</Typography>} />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}
