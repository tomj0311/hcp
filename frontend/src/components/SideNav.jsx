import React from 'react';
import { Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography, Tooltip, Chip, alpha } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
// Switched to lucide-react open-source icon set for a lighter, more elegant aesthetic.
import { LayoutDashboard, Users, UserPlus, Hospital, BadgeDollarSign, LogOut, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const FULL_WIDTH = 240;
const MINI_WIDTH = 56;
export function getDrawerWidth(collapsed){ return collapsed ? MINI_WIDTH : FULL_WIDTH; }

export default function SideNav({ role, onLogout, collapsed }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const isMobile = window.innerWidth < 768;

  const sections = [
    {
      heading: 'GENERAL',
      items: [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.7} /> , to: '/' },
  { label: 'Meetups', icon: <Calendar size={18} strokeWidth={1.7} />, to: '/meetups' },
  { label: 'Pricing', icon: <BadgeDollarSign size={18} strokeWidth={1.7} />, to: '/pricing' }
      ]
    },
    role === 'admin' ? {
      heading: 'MANAGEMENT',
      items: [
  { label: 'Providers', icon: <Hospital size={18} strokeWidth={1.7} />, to: '/register/provider' },
  { label: 'Consumers', icon: <Users size={18} strokeWidth={1.7} />, to: '/register/consumer' },
  { label: 'Register', icon: <UserPlus size={18} strokeWidth={1.7} />, to: '/register' }
      ]
    } : null
  ].filter(Boolean);

  const width = getDrawerWidth(collapsed);

  const NavDrawer = styled(Drawer)(({ theme }) => ({
    width,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      width,
      boxSizing: 'border-box',
      background: theme.palette.mode === 'dark' ? '#141414' : theme.palette.background.paper,
      color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.text.primary,
      borderRight: theme.palette.mode === 'dark' ? '1px solid #1d1d1d' : '1px solid #e5e8ef',
      backdropFilter: 'blur(4px)',
      overflowX: 'hidden',
      transition: 'width .25s ease, background-color .25s ease, border-color .25s ease, color .25s ease',
      display:'flex',
      flexDirection:'column',
      zIndex: isMobile ? theme.zIndex.drawer : theme.zIndex.drawer - 1
    }
  }));

  const ActiveIndicator = styled('span')(({ theme }) => ({
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    background: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main,0.35)}`
  }));

  const itemBaseSx = {
    position: 'relative',
    mb: .25,
    borderRadius: 1,
    pl: collapsed ? 0 : 1.75,
    pr: collapsed ? 0 : 1,
    height: 44,
    mx: collapsed ? 0.5 : 0,
    fontSize: 13,
    letterSpacing: .25,
    width: collapsed ? 48 : '100%',
    '& .MuiListItemIcon-root': {
      minWidth: collapsed ? 48 : 40,
      color: 'inherit',
      justifyContent: 'center',
      // Increase gap between icon and text when expanded
      mr: collapsed ? 0 : 0.5
    },
    '&:hover': { background: theme.palette.mode==='dark' ? alpha('#ffffff', 0.07) : alpha('#000000', 0.05) },
    '&.Mui-selected': {
      background: alpha(theme.palette.primary.main, theme.palette.mode==='dark'? 0.17 : 0.12),
      boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main,0.35)}`,
      '&:hover': { background: alpha(theme.palette.primary.main, theme.palette.mode==='dark'? 0.22 : 0.18) }
    },
    justifyContent: collapsed ? 'center' : 'flex-start',
    transition:'background .18s ease, width .25s ease'
  };

  return (
    <NavDrawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? !collapsed : true}>
      <Toolbar disableGutters sx={{ px: collapsed ? 0 : 2, minHeight:{xs:56, sm:64}, display:'flex', alignItems:'center', justifyContent: 'center', transition:'padding .25s ease' }}>
        <Box component={Link} to="/" sx={{ display:'flex', alignItems:'center', textDecoration:'none', color:'inherit', gap: collapsed ? 0 : 1 }}>
          <Box sx={{width: collapsed ? 32 : 34, height: collapsed ? 32 : 34, borderRadius:1, display:'flex',alignItems:'center',justifyContent:'center', background:alpha(theme.palette.primary.main,0.2), color:theme.palette.primary.main, fontSize: collapsed ? 14 : 16, fontWeight:700}}>H</Box>
          {!collapsed && <Typography variant="subtitle1" sx={{ fontWeight:700, letterSpacing:.5, fontSize:{xs:14, sm:16}, lineHeight:1 }}>HCP</Typography>}
        </Box>
      </Toolbar>
  <Divider sx={{ borderColor: theme.palette.mode==='dark' ? '#262626' : '#e5e8ef', transition:'border-color .25s ease' }} />
      {sections.map(sec => (
        <Box key={sec.heading} sx={{ mt: 1 }}>
          {!collapsed && <Typography variant="overline" sx={{ px: 2, pt: .5, pb: .5, display: 'block', fontSize: {xs:9, sm:10}, letterSpacing: 1.3, opacity: 0.55 }}>{sec.heading}</Typography>}
          <List dense disablePadding sx={{px: collapsed ? 0.25 : 0.5}}>
            {sec.items.map(item => {
              const selected = pathname === item.to;
              const content = (
                <ListItemButton
                  component={Link}
                  to={item.to}
                  key={item.label}
                  selected={selected}
                  sx={itemBaseSx}
                >
                  {selected && <ActiveIndicator />}
                  <Tooltip title={collapsed ? item.label : ''} placement="right">
                    <ListItemIcon>{item.icon}</ListItemIcon>
                  </Tooltip>
                  {!collapsed && (
                    <ListItemText
                      primary={
                        <Box sx={{display:'flex', alignItems:'center', gap: .75}}>
                          <span>{item.label}</span>
                          {item.badge && <Chip size="small" label={item.badge} color="warning" sx={{height:16, '& .MuiChip-label':{px:.5, fontSize:{xs:8, sm:9}, fontWeight:600}}} />}
                        </Box>
                      }
                      primaryTypographyProps={{ fontSize: {xs:12, sm:13}, fontWeight: 600 }}
                    />
                  )}
                </ListItemButton>
              );
              return content;
            })}
          </List>
          <Divider sx={{ borderColor: theme.palette.mode==='dark' ? '#1a1a1a' : '#e5e8ef', mt: .75, transition:'border-color .25s ease' }} />
        </Box>
      ))}
      <Box sx={{ flexGrow: 1 }} />
      <List dense sx={{ mb: 1, px: collapsed ? 0.25 : 0.5 }}>
        <ListItemButton onClick={onLogout} sx={itemBaseSx}>
          <Tooltip title={collapsed ? 'Logout' : ''} placement="right">
            <ListItemIcon><LogOut size={18} strokeWidth={1.7} /></ListItemIcon>
          </Tooltip>
          {!collapsed && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: {xs:12, sm:13}, fontWeight: 600 }} />}
        </ListItemButton>
      </List>
    </NavDrawer>
  );
}
