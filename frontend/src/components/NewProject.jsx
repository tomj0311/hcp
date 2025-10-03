import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Stack, IconButton, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function NewProject({ token }) {
  const navigate = useNavigate();
  const [project, setProject] = useState({
    name: '',
    description: '',
    repository: '',
    framework: '',
    environment: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!project.name.trim()) {
      alert('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...project,
        createdAt: new Date().toISOString(),
        testCases: []
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/automation/projects`, payload);
      navigate(`/automation/project/${res.data.id}`, { state: { project: res.data } });
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    setProject(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <PageHeader
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate('/automation')} size="small">
              <ArrowLeft />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              New Project
            </Typography>
          </Stack>
        }
        subtitle="Create a new test automation project"
        mb={{ xs: 2, sm: 3 }}
      />

      <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
        <Stack spacing={3}>
          <TextField
            label="Project Name"
            fullWidth
            required
            value={project.name}
            onChange={handleInputChange('name')}
            placeholder="Enter project name"
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={project.description}
            onChange={handleInputChange('description')}
            placeholder="Describe what this project will test"
          />

          <TextField
            label="Repository URL"
            fullWidth
            value={project.repository}
            onChange={handleInputChange('repository')}
            placeholder="https://github.com/username/repo"
          />

          <TextField
            label="Testing Framework"
            fullWidth
            value={project.framework}
            onChange={handleInputChange('framework')}
            placeholder="e.g., Selenium, Cypress, Playwright, Jest"
          />

          <TextField
            label="Environment"
            fullWidth
            value={project.environment}
            onChange={handleInputChange('environment')}
            placeholder="e.g., Development, Staging, Production"
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/automation')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isLoading || !project.name.trim()}
              startIcon={<Save size={16} />}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}