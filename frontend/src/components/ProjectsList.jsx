import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, Stack, IconButton, Button, Card, CardContent, 
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FolderOpen, Calendar, TestTube } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function ProjectsList({ token, mode, onToggleMode }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    repository: '',
    framework: '',
    environment: ''
  });

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/projects`);
      setProjects(res.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async () => {
    try {
      const payload = {
        ...newProject,
        createdAt: new Date().toISOString()
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/automation/projects`, payload);
      
      setOpenNewProjectDialog(false);
      setNewProject({ name: '', description: '', repository: '', framework: '', environment: '' });
      loadProjects();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleProjectClick = (project) => {
    navigate(`/automation/project/${project.id}`, { state: { project } });
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <PageHeader
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate('/automation')} size="small">
              <ArrowLeft />
            </IconButton>
            <Typography variant="body1" component="h1" sx={{ fontWeight: 700, fontSize: '14px' }}>
              All Projects
            </Typography>
          </Stack>
        }
        subtitle="Manage your test automation projects"
        mb={{ xs: 2, sm: 3 }}
      />

      {/* Header Actions */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {projects.length} Project{projects.length !== 1 ? 's' : ''}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => setOpenNewProjectDialog(true)}
          startIcon={<Plus size={16} />}
        >
          New Project
        </Button>
      </Paper>

      {/* Projects Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {projects.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No projects yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first automation project to get started with test management.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => setOpenNewProjectDialog(true)}
                startIcon={<Plus size={16} />}
                size="large"
              >
                Create First Project
              </Button>
            </Paper>
          </Grid>
        ) : (
          projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }} 
                onClick={() => handleProjectClick(project)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <FolderOpen size={20} color="primary" />
                    <Typography variant="h6" component="h3" noWrap>
                      {project.name}
                    </Typography>
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {project.description || 'No description provided'}
                  </Typography>
                  
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TestTube size={14} />
                      <Typography variant="caption" color="text.secondary">
                        {project.testCases?.[0]?.count || 0} tests
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Calendar size={14} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </Stack>
                  
                  {project.framework && (
                    <Typography variant="caption" sx={{ 
                      display: 'inline-block',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.7rem'
                    }}>
                      {project.framework}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<FolderOpen size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProjectClick(project);
                    }}
                  >
                    Open Project
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* New Project Dialog */}
      <Dialog open={openNewProjectDialog} onClose={() => setOpenNewProjectDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              fullWidth
              required
              value={newProject.name}
              onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newProject.description}
              onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this project will test"
            />
            
            <TextField
              label="Repository URL"
              fullWidth
              value={newProject.repository}
              onChange={(e) => setNewProject(prev => ({ ...prev, repository: e.target.value }))}
              placeholder="https://github.com/username/repo"
            />
            
            <TextField
              label="Testing Framework"
              fullWidth
              value={newProject.framework}
              onChange={(e) => setNewProject(prev => ({ ...prev, framework: e.target.value }))}
              placeholder="e.g., Selenium, Cypress, Playwright, Jest"
            />
            
            <TextField
              label="Environment"
              fullWidth
              value={newProject.environment}
              onChange={(e) => setNewProject(prev => ({ ...prev, environment: e.target.value }))}
              placeholder="e.g., Development, Staging, Production"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProjectDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained"
            disabled={!newProject.name.trim()}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}