import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Stack, IconButton, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Edit, Trash2, Search, Filter } from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import axios from 'axios';

export default function TestCasesList({ token, mode, onToggleMode }) {
  const navigate = useNavigate();
  const [testCases, setTestCases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredTestCases, setFilteredTestCases] = useState([]);
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    search: ''
  });
  const [openTestCaseDialog, setOpenTestCaseDialog] = useState(false);
  const [newTestCase, setNewTestCase] = useState({ 
    name: '', 
    description: '', 
    steps: '', 
    projectId: '' 
  });

  const loadTestCases = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/testcases`);
      setTestCases(res.data);
      setFilteredTestCases(res.data);
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/automation/projects`);
      setProjects(res.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    loadTestCases();
    loadProjects();
  }, []);

  useEffect(() => {
    let filtered = testCases;

    if (filters.project) {
      filtered = filtered.filter(tc => tc.projectId === filters.project);
    }

    if (filters.status) {
      filtered = filtered.filter(tc => tc.lastResult === filters.status);
    }

    if (filters.search) {
      filtered = filtered.filter(tc => 
        tc.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        tc.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredTestCases(filtered);
  }, [filters, testCases]);

  const handleCreateTestCase = async () => {
    try {
      const payload = {
        ...newTestCase,
        createdAt: new Date().toISOString(),
        lastResult: 'pending'
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/automation/testcases`, payload);
      
      setOpenTestCaseDialog(false);
      setNewTestCase({ name: '', description: '', steps: '', projectId: '' });
      loadTestCases();
    } catch (error) {
      console.error('Error creating test case:', error);
    }
  };

  const handleRunTest = async (testCaseId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/automation/testcases/${testCaseId}/run`);
      loadTestCases();
    } catch (error) {
      console.error('Error running test:', error);
    }
  };

  const handleDeleteTest = async (testCaseId) => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/automation/testcases/${testCaseId}`);
        loadTestCases();
      } catch (error) {
        console.error('Error deleting test case:', error);
      }
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

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
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
              Test Cases
            </Typography>
          </Stack>
        }
        subtitle="Manage and execute all your test cases"
        mb={{ xs: 2, sm: 3 }}
      />

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search test cases..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} />
            }}
            sx={{ flexGrow: 1 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={filters.project}
              label="Project"
              onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="passed">Passed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="running">Running</MenuItem>
            </Select>
          </FormControl>

          <Button 
            variant="contained" 
            onClick={() => setOpenTestCaseDialog(true)}
            startIcon={<Plus size={16} />}
          >
            Add Test Case
          </Button>
        </Stack>
      </Paper>

      {/* Test Cases Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTestCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No test cases found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTestCases.map((testCase) => (
                  <TableRow key={testCase.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {testCase.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getProjectName(testCase.projectId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                        {testCase.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={testCase.lastResult || 'pending'}
                        size="small"
                        color={getStatusColor(testCase.lastResult)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {testCase.lastRun ? new Date(testCase.lastRun).toLocaleDateString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleRunTest(testCase.id)}
                          title="Run test"
                        >
                          <Play size={16} />
                        </IconButton>
                        <IconButton 
                          size="small"
                          title="Edit test"
                        >
                          <Edit size={16} />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteTest(testCase.id)}
                          title="Delete test"
                          color="error"
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Test Case Dialog */}
      <Dialog open={openTestCaseDialog} onClose={() => setOpenTestCaseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Test Case</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={newTestCase.projectId}
                label="Project"
                onChange={(e) => setNewTestCase(prev => ({ ...prev, projectId: e.target.value }))}
              >
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
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
          <Button 
            onClick={handleCreateTestCase} 
            variant="contained"
            disabled={!newTestCase.name || !newTestCase.projectId}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}