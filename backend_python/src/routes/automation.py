from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import logging

from src.db import get_collections
from src.utils.auth import verify_token_middleware

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/automation", tags=["automation"])

# Pydantic models
class Project(BaseModel):
    name: str
    description: str = ""
    repository: str = ""
    framework: str = ""
    environment: str = ""

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    repository: str = ""
    framework: str = ""
    environment: str = ""
    createdAt: str
    testCases: List[dict] = []

class TestCase(BaseModel):
    name: str
    description: str = ""
    steps: str = ""
    projectId: str

class TestCaseResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    steps: str = ""
    projectId: str
    createdAt: str
    lastResult: str = "pending"
    lastRun: Optional[str] = None

class TestRun(BaseModel):
    id: str
    projectId: str
    testCaseId: Optional[str] = None
    status: str
    duration: int = 0
    createdAt: str
    results: dict = {}

# Projects endpoints
@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(verify_token_middleware)):
    """Get all automation projects"""
    collections = get_collections()
    
    try:
        cursor = collections['automationProjects'].find({})
        projects = await cursor.to_list(length=None)
        
        # Convert MongoDB _id to id and format response
        result = []
        for project in projects:
            project['id'] = project.get('id', str(project['_id']))
            project.pop('_id', None)
            
            # Get test cases count for each project
            test_cases_count = await collections['automationTestCases'].count_documents({"projectId": project['id']})
            project['testCases'] = [{"count": test_cases_count}]
            
            result.append(project)
        
        return result
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: Project, current_user: dict = Depends(verify_token_middleware)):
    """Create a new automation project"""
    collections = get_collections()
    
    try:
        project_id = str(uuid.uuid4())
        project_data = {
            "id": project_id,
            "name": project.name,
            "description": project.description,
            "repository": project.repository,
            "framework": project.framework,
            "environment": project.environment,
            "createdAt": datetime.utcnow().isoformat(),
            "testCases": []
        }
        
        await collections['automationProjects'].insert_one(project_data)
        
        # Remove MongoDB _id from response
        project_data.pop('_id', None)
        return project_data
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")

@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Get a specific project by ID"""
    collections = get_collections()
    
    try:
        project = await collections['automationProjects'].find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get test cases for this project
        cursor = collections['automationTestCases'].find({"projectId": project_id})
        test_cases = await cursor.to_list(length=None)
        
        project['id'] = project.get('id', str(project['_id']))
        project.pop('_id', None)
        project['testCases'] = [{"id": tc.get('id', str(tc['_id'])), "name": tc.get('name', '')} for tc in test_cases]
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project")

# Test Cases endpoints
@router.get("/testcases", response_model=List[TestCaseResponse])
async def get_test_cases(current_user: dict = Depends(verify_token_middleware)):
    """Get all test cases"""
    collections = get_collections()
    
    try:
        cursor = collections['automationTestCases'].find({})
        test_cases = await cursor.to_list(length=None)
        
        result = []
        for tc in test_cases:
            tc['id'] = tc.get('id', str(tc['_id']))
            tc.pop('_id', None)
            result.append(tc)
        
        return result
    except Exception as e:
        logger.error(f"Error fetching test cases: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch test cases")

@router.post("/testcases", response_model=TestCaseResponse)
async def create_test_case(test_case: TestCase, current_user: dict = Depends(verify_token_middleware)):
    """Create a new test case"""
    collections = get_collections()
    
    try:
        # Verify project exists
        project = await collections['automationProjects'].find_one({"id": test_case.projectId})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        test_case_id = str(uuid.uuid4())
        test_case_data = {
            "id": test_case_id,
            "name": test_case.name,
            "description": test_case.description,
            "steps": test_case.steps,
            "projectId": test_case.projectId,
            "createdAt": datetime.utcnow().isoformat(),
            "lastResult": "pending",
            "lastRun": None
        }
        
        await collections['automationTestCases'].insert_one(test_case_data)
        
        test_case_data.pop('_id', None)
        return test_case_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating test case: {e}")
        raise HTTPException(status_code=500, detail="Failed to create test case")

@router.get("/projects/{project_id}/testcases", response_model=List[TestCaseResponse])
async def get_project_test_cases(project_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Get all test cases for a specific project"""
    collections = get_collections()
    
    try:
        cursor = collections['automationTestCases'].find({"projectId": project_id})
        test_cases = await cursor.to_list(length=None)
        
        result = []
        for tc in test_cases:
            tc['id'] = tc.get('id', str(tc['_id']))
            tc.pop('_id', None)
            result.append(tc)
        
        return result
    except Exception as e:
        logger.error(f"Error fetching test cases for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch test cases")

@router.post("/testcases/{test_case_id}/run")
async def run_test_case(test_case_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Run a specific test case"""
    collections = get_collections()
    
    try:
        # Get test case
        test_case = await collections['automationTestCases'].find_one({"id": test_case_id})
        if not test_case:
            raise HTTPException(status_code=404, detail="Test case not found")
        
        # Simulate test execution (in real implementation, this would trigger actual test runner)
        import random
        result = random.choice(["passed", "failed"])
        duration = random.randint(1000, 5000)  # milliseconds
        
        # Create test run record
        run_id = str(uuid.uuid4())
        test_run_data = {
            "id": run_id,
            "projectId": test_case["projectId"],
            "testCaseId": test_case_id,
            "status": result,
            "duration": duration,
            "createdAt": datetime.utcnow().isoformat(),
            "results": {
                "steps": len(test_case.get("steps", "").split("\n")),
                "assertions": random.randint(1, 10),
                "screenshots": random.randint(0, 3)
            }
        }
        
        await collections['automationTestRuns'].insert_one(test_run_data)
        
        # Update test case with latest result
        await collections['automationTestCases'].update_one(
            {"id": test_case_id},
            {"$set": {
                "lastResult": result,
                "lastRun": datetime.utcnow().isoformat()
            }}
        )
        
        return {"message": "Test case executed", "result": result, "duration": duration}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running test case {test_case_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to run test case")

@router.post("/projects/{project_id}/run")
async def run_project_tests(project_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Run all test cases in a project"""
    collections = get_collections()
    
    try:
        # Get all test cases for the project
        cursor = collections['automationTestCases'].find({"projectId": project_id})
        test_cases = await cursor.to_list(length=None)
        
        if not test_cases:
            raise HTTPException(status_code=404, detail="No test cases found for this project")
        
        results = []
        total_duration = 0
        
        for test_case in test_cases:
            # Simulate test execution
            import random
            result = random.choice(["passed", "failed"])
            duration = random.randint(1000, 5000)
            total_duration += duration
            
            # Create test run record
            run_id = str(uuid.uuid4())
            test_run_data = {
                "id": run_id,
                "projectId": project_id,
                "testCaseId": test_case.get("id", str(test_case["_id"])),
                "status": result,
                "duration": duration,
                "createdAt": datetime.utcnow().isoformat(),
                "results": {
                    "steps": len(test_case.get("steps", "").split("\n")),
                    "assertions": random.randint(1, 10),
                    "screenshots": random.randint(0, 3)
                }
            }
            
            await collections['automationTestRuns'].insert_one(test_run_data)
            
            # Update test case with latest result
            await collections['automationTestCases'].update_one(
                {"id": test_case.get("id", str(test_case["_id"]))},
                {"$set": {
                    "lastResult": result,
                    "lastRun": datetime.utcnow().isoformat()
                }}
            )
            
            results.append({
                "testCaseId": test_case.get("id", str(test_case["_id"])),
                "name": test_case["name"],
                "result": result,
                "duration": duration
            })
        
        return {
            "message": f"Executed {len(test_cases)} test cases",
            "totalDuration": total_duration,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running project tests {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to run project tests")

@router.get("/projects/{project_id}/runs")
async def get_project_runs(project_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Get test run history for a project"""
    collections = get_collections()
    
    try:
        cursor = collections['automationTestRuns'].find({"projectId": project_id}).sort("createdAt", -1).limit(10)
        runs = await cursor.to_list(length=None)
        
        result = []
        for run in runs:
            run['id'] = run.get('id', str(run['_id']))
            run.pop('_id', None)
            result.append(run)
        
        return result
    except Exception as e:
        logger.error(f"Error fetching runs for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch test runs")

@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(verify_token_middleware)):
    """Get automation analytics"""
    collections = get_collections()
    
    try:
        # Count projects and test cases
        total_projects = await collections['automationProjects'].count_documents({})
        total_test_cases = await collections['automationTestCases'].count_documents({})
        
        # Calculate pass rate from recent runs
        cursor = collections['automationTestRuns'].find({}).sort("createdAt", -1).limit(100)
        recent_runs = await cursor.to_list(length=None)
        
        if recent_runs:
            passed_runs = sum(1 for run in recent_runs if run.get("status") == "passed")
            pass_rate = round((passed_runs / len(recent_runs)) * 100)
            last_run = recent_runs[0]["createdAt"] if recent_runs else None
        else:
            pass_rate = 0
            last_run = None
        
        return {
            "totalProjects": total_projects,
            "totalTestCases": total_test_cases,
            "passRate": pass_rate,
            "lastRun": last_run
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.delete("/testcases/{test_case_id}")
async def delete_test_case(test_case_id: str, current_user: dict = Depends(verify_token_middleware)):
    """Delete a test case"""
    collections = get_collections()
    
    try:
        result = await collections['automationTestCases'].delete_one({"id": test_case_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Test case not found")
        
        # Also delete associated test runs
        await collections['automationTestRuns'].delete_many({"testCaseId": test_case_id})
        
        return {"message": "Test case deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting test case {test_case_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete test case")