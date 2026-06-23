# Kubernetes Investigation Layer

The investigation layer is a collection of inspection components that behave like a junior DevOps engineer collecting evidence before AI reasoning starts.

## Architecture

```
Investigation Service (Orchestrator)
    ├── Pod Inspector
    ├── Logs Collector
    ├── Events Analyzer
    ├── Deployment Inspector
    └── Network Inspector
```

## Components

### KubectlExecutor
Core utility for executing kubectl commands safely.

**Features:**
- Subprocess-based execution
- Timeout handling (30s)
- Structured error handling
- Logging for all operations

**Usage:**
```python
executor = KubectlExecutor(kubeconfig_path)
result = executor.get_pods()
```

### Pod Inspector
Detects unhealthy pods by checking their status.

**Unhealthy Statuses Detected:**
- CrashLoopBackOff
- ImagePullBackOff
- Pending
- Error
- OOMKilled
- ContainerCreating
- ErrImagePull

**Output:**
```json
{
  "healthy": false,
  "total_pods": 10,
  "problematic_pods": [
    {
      "name": "payment-service",
      "namespace": "default",
      "status": "CrashLoopBackOff"
    }
  ]
}
```

### Logs Collector
Fetches and extracts relevant logs from problematic pods.

**Focus Areas:**
- Exceptions
- Connection failures
- Missing environment variables
- Image failures
- Startup errors

**Behavior:**
- Limits to 50 lines per pod (via tail)
- Extracts error-related lines
- Processes up to 10 problematic pods

### Events Analyzer
Analyzes Kubernetes events from the past 30 minutes.

**Critical Event Types Detected:**
- FailedScheduling
- BackOff
- FailedMount
- FailedPull
- ErrImagePull
- Unhealthy
- Failed
- NotReady

**Output:**
```json
{
  "critical_events": [
    {
      "type": "Warning",
      "reason": "BackOff",
      "message": "Back-off restarting failed container",
      "object_name": "my-pod",
      "namespace": "default"
    }
  ],
  "total_events": 150
}
```

### Deployment Inspector
Checks deployment health and replica status.

**Checks:**
- Available vs desired replicas
- Ready replicas
- Updated replicas
- Deployment conditions

**Output:**
```json
{
  "healthy": false,
  "total_deployments": 5,
  "unhealthy_deployments": [
    {
      "name": "api-server",
      "namespace": "production",
      "desired_replicas": 3,
      "available_replicas": 1,
      "ready_replicas": 1
    }
  ]
}
```

### Network Inspector
Inspects services and networking configuration.

**Checks:**
- Service existence
- Endpoint availability
- Selector configuration
- Service-to-endpoint mapping

**Issues Detected:**
- NoEndpoints: Service exists but has no available endpoints

## API Endpoint

### POST /investigate

Runs a complete investigation of the Kubernetes cluster.

**Request:**
```http
POST /investigate
```

**Response:**
```json
{
  "status": "success",
  "investigation": {
    "pods": {
      "healthy": false,
      "total_pods": 10,
      "problematic_pods": []
    },
    "logs": {
      "default/my-pod": {
        "total_lines": 150,
        "relevant_errors": [],
        "last_lines": []
      }
    },
    "events": {
      "critical_events": [],
      "total_events": 50
    },
    "deployments": {
      "healthy": true,
      "total_deployments": 5,
      "unhealthy_deployments": []
    },
    "network": {
      "services": {},
      "endpoints": {},
      "issues": []
    }
  }
}
```

## Execution Flow

1. **Pod Inspection** - Check all pods for unhealthy status
2. **Events Analysis** - Analyze recent critical events
3. **Deployment Inspection** - Check deployment replica status
4. **Network Inspection** - Check service and endpoint configuration
5. **Logs Collection** - Fetch logs only for problematic pods (if any)

## Configuration

Set environment variables in `.env`:

```env
KUBECONFIG_PATH=/path/to/kubeconfig
```

If not set, kubectl will use the default kubeconfig location.

## Error Handling

- All components return structured responses with success/error status
- Timeouts are set to 30 seconds per kubectl command
- Failed kubectl commands are logged and gracefully handled
- Investigation continues even if individual components fail

## Implementation Notes

- Uses `kubectl` commands internally via subprocess (no Python SDK)
- All commands execute with JSON output format (`-o json`)
- Event filtering is done in-memory (last 30 minutes)
- Logs are limited to prevent large responses
- Components are independent and can be used separately
