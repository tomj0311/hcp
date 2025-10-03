import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, Stack, IconButton, Button, Card, CardContent, 
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Edit, Trash2, TestTube, Clock, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function ProjectDashboard({ token, mode, onToggleMode }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(location.state?.project || null);
  const [testCases, setTestCases] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [openTestCaseDialog, setOpenTestCaseDialog] = useState(false);
  const [newTestCase, setNewTestCase] = useState({ name: '', description: '', steps: '' });
  const [analytics, setAnalytics] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    lastRun: null
  });

  const loadProject = async () => {
    if (projectId === 'new') {
      setProject({ id: 'new', name: 'New Project', description: '', testCases: [] });
      return;
    }

    if (!project && projectId) {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/projects/${projectId}`);
        setProject(res.data);
      } catch (error) {
        console.error('Error loading project:', error);
      }
    }
  };

  const loadTestCases = async () => {
    if (!projectId || projectId === 'new') return;
    
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/projects/${projectId}/testcases`);
      setTestCases(res.data);
      
      // Update analytics
      const passed = res.data.filter(tc => tc.lastResult === 'passed').length;
      const failed = res.data.filter(tc => tc.lastResult === 'failed').length;
      
      setAnalytics({
        totalTests: res.data.length,
        passedTests: passed,
        failedTests: failed,
        lastRun: res.data.length > 0 ? res.data[0].lastRun : null
      });
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const loadTestRuns = async () => {
    if (!projectId || projectId === 'new') return;
    
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/projects/${projectId}/runs`);
      setTestRuns(res.data.slice(0, 5)); // Show only recent 5 runs
    } catch (error) {
      console.error('Error loading test runs:', error);
    }
  };

  useEffect(() => {
    loadProject();
    loadTestCases();
    loadTestRuns();
  }, [projectId]);

  const handleCreateTestCase = async () => {
    try {
      const payload = {
        ...newTestCase,
        projectId: projectId,
        createdAt: new Date().toISOString(),
        lastResult: 'pending'
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/automation/testcases`, payload);
      
      setOpenTestCaseDialog(false);
      setNewTestCase({ name: '', description: '', steps: '' });
      loadTestCases();
    } catch (error) {
      console.error('Error creating test case:', error);
    }
  };

  const handleRunTest = async (testCaseId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/automation/testcases/${testCaseId}/run`);
      loadTestCases();
      loadTestRuns();
    } catch (error) {
      console.error('Error running test:', error);
    }
  };

  const handleRunAllTests = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/automation/projects/${projectId}/run`);
      loadTestCases();
      loadTestRuns();
    } catch (error) {
      console.error('Error running all tests:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle size={16} />;
      case 'failed': return <XCircle size={16} />;
      case 'running': return <Clock size={16} />;
      default: return <TestTube size={16} />;
    }
  };

  if (!project) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <PageHeader
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate('/automation')} size="small">
              <ArrowLeft />
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
              {project.name}
            </Typography>
          </Stack>
        }
        subtitle={project.description}
        mb={{ xs: 2, sm: 3 }}
      />

      {/* Project Analytics */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              {analytics.totalTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Tests
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
              {analytics.passedTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Passed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="error.main" sx={{ fontWeight: 700 }}>
              {analytics.failedTests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Failed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {analytics.totalTests > 0 ? Math.round((analytics.passedTests / analytics.totalTests) * 100) : 0}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pass Rate
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Test Cases */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Test Cases
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button 
                  size="small" 
                  onClick={handleRunAllTests}
                  startIcon={<Play size={16} />}
                  disabled={testCases.length === 0}
                  variant="outlined"
                >
                  Run All
                </Button>
                <Button 
                  size="small" 
                  onClick={() => setOpenTestCaseDialog(true)}
                  startIcon={<Plus size={16} />}
                  variant="contained"
                >
                  Add Test
                </Button>
              </Stack>
            </Box>

            {testCases.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No test cases yet. Create your first test case.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => setOpenTestCaseDialog(true)}
                  startIcon={<Plus size={16} />}
                  sx={{ mt: 1 }}
                >
                  Create Test Case
                </Button>
              </Paper>
            ) : (
              <List>
                {testCases.map((testCase) => (
                  <ListItem 
                    key={testCase.id}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{testCase.name}</Typography>
                          <Chip 
                            icon={getStatusIcon(testCase.lastResult)}
                            label={testCase.lastResult || 'pending'}
                            size="small"
                            color={getStatusColor(testCase.lastResult)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={testCase.description}
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRunTest(testCase.id)}
                          size="small"
                        >
                          <Play size={16} />
                        </IconButton>
                        <IconButton edge="end" size="small">
                          <Edit size={16} />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Test Runs */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Recent Runs
            </Typography>
            {testRuns.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No test runs yet
              </Typography>
            ) : (
              <List dense>
                {testRuns.map((run) => (
                  <ListItem key={run.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            Run #{run.id}
                          </Typography>
                          <Chip 
                            label={run.status}
                            size="small"
                            color={getStatusColor(run.status)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={`${new Date(run.createdAt).toLocaleString()} • ${run.duration}ms`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Test Case Dialog */}
      <Dialog open={openTestCaseDialog} onClose={() => setOpenTestCaseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Test Case</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Test Case Name"
              fullWidth
              value={newTestCase.name}
              onChange={(e) => setNewTestCase(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newTestCase.description}
              onChange={(e) => setNewTestCase(prev => ({ ...prev, description: e.target.value }))}
            />
            <TextField
              label="Test Steps"
              fullWidth
              multiline
              rows={6}
              placeholder="Describe the test steps here..."
              value={newTestCase.steps}
              onChange={(e) => setNewTestCase(prev => ({ ...prev, steps: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTestCaseDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTestCase} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}