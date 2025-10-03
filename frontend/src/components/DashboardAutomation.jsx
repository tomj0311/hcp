import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Grid, Paper, Stack, IconButton, Switch, Button, Card, CardContent, CardActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RefreshCw as RefreshIcon, Plus, TestTube, FolderOpen, BarChart3, Play } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function DashboardAutomation({ token, mode, onToggleMode, role }) {
  const [projects, setProjects] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalProjects: 0,
    totalTestCases: 0,
    passRate: 0,
    lastRun: null
  });
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/automation/projects');
      setProjects(res.data);
      setAnalytics(prev => ({ ...prev, totalProjects: res.data.length }));
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTestCases = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/automation/testcases');
      setTestCases(res.data);
      setAnalytics(prev => ({ ...prev, totalTestCases: res.data.length }));
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/automation/analytics');
      setAnalytics(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  useEffect(() => {
    loadProjects();
    loadTestCases();
    loadAnalytics();
  }, []);

  const handleProjectClick = (project) => {
    navigate(`/automation/project/${project.id}`, { state: { project } });
  };

  const handleNewProject = () => {
    navigate('/automation/project/new');
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <PageHeader
        title="TEST AUTOMATION — Dashboard"
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              {mode === 'dark' ? 'Dark' : 'Light'} mode
            </Typography>
            <Switch 
              checked={mode === 'dark'} 
              onChange={onToggleMode} 
              inputProps={{ 'aria-label': 'toggle theme' }} 
              size="small" 
            />
            <IconButton 
              aria-label="refresh" 
              onClick={() => {
                loadProjects();
                loadTestCases();
                loadAnalytics();
              }} 
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        )}
        mb={{ xs: 2, sm: 3 }}
      />

      {/* Analytics Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={({ palette, custom }) => ({
            p: { xs: 2, sm: 3 },
            height: { xs: 120, sm: 140 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: custom.tiles.image.bg,
            color: custom.tiles.image.fg,
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <div>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {analytics.totalProjects}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Total Projects
              </Typography>
            </div>
            <FolderOpen size={24} style={{ opacity: 0.7 }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={({ custom }) => ({
            p: { xs: 2, sm: 3 },
            height: { xs: 120, sm: 140 },
            background: custom.tiles.storytelling.bg,
            color: custom.tiles.storytelling.fg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <div>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {analytics.totalTestCases}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Total Test Cases
              </Typography>
            </div>
            <TestTube size={24} style={{ opacity: 0.7 }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={({ custom }) => ({
            p: { xs: 2, sm: 3 },
            height: { xs: 120, sm: 140 },
            background: custom.tiles.accentA.bg,
            color: custom.tiles.accentA.fg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <div>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {analytics.passRate}%
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Pass Rate
              </Typography>
            </div>
            <BarChart3 size={24} style={{ opacity: 0.7 }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={({ palette }) => ({
            p: { xs: 2, sm: 3 },
            height: { xs: 120, sm: 140 },
            background: palette.mode === 'dark' ? palette.grey[800] : palette.grey[100],
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <div>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Last Run
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {analytics.lastRun ? new Date(analytics.lastRun).toLocaleDateString() : 'No runs yet'}
              </Typography>
            </div>
            <Play size={24} style={{ opacity: 0.7 }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={({ custom }) => ({
            p: { xs: 2, sm: 3 },
            background: custom.tiles.image.bg,
            color: custom.tiles.image.fg,
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Quick Actions
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 2 }}>
              Create new projects and manage test automation.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button 
                variant="contained" 
                color="inherit" 
                size="small" 
                onClick={handleNewProject}
                startIcon={<Plus size={16} />}
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? 'text.primary' : 'text.primary',
                  bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'common.white',
                  opacity: 0.9,
                  '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'common.white', opacity: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                })}
              >
                New Project
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/automation/testcases')}
                sx={(theme) => ({
                  borderColor: theme.palette.common.white,
                  color: theme.palette.common.white,
                  opacity: 0.9,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                })}
              >
                View All Tests
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={({ custom }) => ({
            p: { xs: 2, sm: 3 },
            background: custom.tiles.storytelling.bg,
            color: custom.tiles.storytelling.fg,
            boxShadow: '0 6px 26px -10px rgba(0,0,0,0.35)'
          })}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Recent Activity
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Latest test runs and project updates.
            </Typography>
            <Button 
              variant="outlined" 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/automation/reports')}
              sx={{ mt: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              View Reports
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Projects List */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
            Recent Projects
          </Typography>
          <Button 
            size="small" 
            onClick={handleNewProject}
            startIcon={<Plus size={16} />}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Add Project
          </Button>
        </Box>
        
        <Grid container spacing={{ xs: 1.5, sm: 2 }} aria-label="projects list">
          {projects.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">
                  No projects yet. Create your first automation project.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={handleNewProject}
                  startIcon={<Plus size={16} />}
                  sx={{ mt: 2 }}
                >
                  Create Project
                </Button>
              </Paper>
            </Grid>
          ) : (
            projects.map((project) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
                <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => handleProjectClick(project)}>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {project.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.testCases?.length || 0} test cases
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<FolderOpen size={14} />}>
                      Open Project
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>
    </Box>
  );
}