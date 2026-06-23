import json
from typing import Dict, Any, List
from loguru import logger

UNHEALTHY_STATUSES = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "Pending",
    "Error",
    "OOMKilled",
    "ContainerCreating",
    "ErrImagePull",
    "InvalidImageName",
    "ImageInspectError",
    "ErrImageNeverPull",
    "RegistryUnavailable",
    "RepositoryUnavailable",
}


class PodInspector:
    def __init__(self, kubectl_executor):
        self.kubectl = kubectl_executor

    def inspect(self) -> Dict[str, Any]:
        logger.info("Inspecting pod status")
        result = self.kubectl.get_pods()

        if not result["success"]:
            return {
                "healthy": True,
                "problematic_pods": [],
                "error": result.get("error", "Failed to fetch pods"),
            }

        try:
            pods_data = json.loads(result["output"])
        except json.JSONDecodeError:
            logger.error("Failed to parse kubectl output")
            return {"healthy": True, "problematic_pods": [], "error": "Parse error"}

        problematic_pods = []

        for item in pods_data.get("items", []):
            metadata = item.get("metadata", {})
            status = item.get("status", {})
            pod_phase = status.get("phase", "Unknown")

            if pod_phase in UNHEALTHY_STATUSES:
                problematic_pods.append(
                    {
                        "name": metadata.get("name"),
                        "namespace": metadata.get("namespace"),
                        "status": pod_phase,
                        "conditions": status.get("conditions", []),
                    }
                )
                continue

            container_statuses = status.get("containerStatuses", [])
            for container in container_statuses:
                state = container.get("state", {})
                if "waiting" in state:
                    waiting_reason = state["waiting"].get("reason", "")
                    if waiting_reason in UNHEALTHY_STATUSES:
                        problematic_pods.append(
                            {
                                "name": metadata.get("name"),
                                "namespace": metadata.get("namespace"),
                                "status": waiting_reason,
                                "container": container.get("name"),
                            }
                        )
                        break

                if "terminated" in state:
                    exit_code = state["terminated"].get("exitCode", 0)
                    if exit_code != 0:
                        problematic_pods.append(
                            {
                                "name": metadata.get("name"),
                                "namespace": metadata.get("namespace"),
                                "status": "Terminated",
                                "exit_code": exit_code,
                                "container": container.get("name"),
                            }
                        )
                        break

        return {
            "healthy": len(problematic_pods) == 0,
            "total_pods": len(pods_data.get("items", [])),
            "problematic_pods": problematic_pods,
        }
