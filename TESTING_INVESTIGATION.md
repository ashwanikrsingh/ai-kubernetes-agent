# Testing the Investigation Layer

## Prerequisites

1. Kubernetes cluster access (local minikube, kind, or remote cluster)
2. kubectl installed and configured
3. FastAPI backend running

## Running the Backend

### Option 1: Docker Compose
```bash
cd /Users/ashwani/raw/ai-kubernetes-agent
docker compose up --build
```

### Option 2: Local Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Testing the Investigation Endpoint

### Using curl

```bash
curl -X POST http://localhost:8000/investigate \
  -H "Content-Type: application/json"
```

### Using Python

```python
import httpx
import json

async with httpx.AsyncClient() as client:
    response = await client.post("http://localhost:8000/investigate")
    data = response.json()
    print(json.dumps(data, indent=2))
```

### Using the FastAPI Swagger UI

1. Open http://localhost:8000/docs
2. Find the POST /investigate endpoint
3. Click "Try it out"
4. Click "Execute"

## Expected Response Structure

```json
{
  "status": "success",
  "investigation": {
    "pods": {
      "healthy": true,
      "total_pods": 10,
      "problematic_pods": []
    },
    "logs": {},
    "events": {
      "critical_events": [],
      "total_events": 5
    },
    "deployments": {
      "healthy": true,
      "total_deployments": 3,
      "unhealthy_deployments": []
    },
    "network": {
      "services": {
        "total": 2,
        "services": [...]
      },
      "endpoints": {
        "total": 2,
        "endpoints": [...]
      },
      "issues": []
    }
  }
}
```

## Testing Scenarios

### Test 1: Healthy Cluster
- No modifications needed
- All pods running
- No unhealthy deployments
- Expected: All components report "healthy": true

### Test 2: Pod Failure
1. Create a pod that fails to start:
```bash
kubectl create deployment test-fail --image=invalid-image
```

2. Call `/investigate`
3. Expected: 
   - Pod Inspector finds problematic pods
   - Logs Collector attempts to fetch logs
   - Events Analyzer reports ImagePullBackOff event

### Test 3: Deployment Scaling Issue
1. Create a deployment with invalid replica count:
```bash
kubectl create deployment test-scaling --image=nginx --replicas=3
kubectl patch deployment test-scaling -p '{"spec":{"replicas":0}}'
```

2. Call `/investigate`
3. Expected:
   - Deployment Inspector finds unavailable replicas
   - Events Analyzer may report scheduling issues

## Cleanup

Remove test resources:
```bash
kubectl delete deployment test-fail
kubectl delete deployment test-scaling
```

## Troubleshooting

### Issue: Connection refused on localhost:8000

**Solution:**
- Ensure backend is running: `docker compose up`
- Check port is not in use: `lsof -i :8000`

### Issue: kubectl not found error

**Solution:**
- Ensure kubectl is installed: `which kubectl`
- Ensure KUBECONFIG is set or kubeconfig exists at ~/.kube/config

### Issue: Permission denied

**Solution:**
- Verify kubectl cluster access: `kubectl cluster-info`
- Check RBAC permissions for your user

### Issue: Empty responses for pods/events/deployments

**Solution:**
- Verify cluster has resources: `kubectl get pods -A`
- Check for kubectl JSON parsing issues in logs

## Integration with Frontend

Once the backend investigation is working, the frontend can:

1. Add a call to `POST /investigate` in the `InvestigateButton` component
2. Display results in a new component
3. Show critical issues to the user

Example frontend integration:
```typescript
const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/investigate`
);

const investigation = response.data.investigation;
// Display investigation.pods.problematic_pods
// Display investigation.events.critical_events
// Display investigation.deployments.unhealthy_deployments
```

## Performance Notes

- Initial investigation may take 5-10 seconds depending on cluster size
- Pod log fetching is limited to 50 lines per pod
- Event filtering is done in-memory (last 30 minutes)
- Maximum 10 problematic pods have logs collected
