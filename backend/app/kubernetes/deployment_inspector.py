import json
from typing import Dict, Any, List
from loguru import logger


class DeploymentInspector:
    def __init__(self, kubectl_executor):
        self.kubectl = kubectl_executor

    def inspect(self) -> Dict[str, Any]:
        logger.info("Inspecting deployments")
        result = self.kubectl.get_deployments()

        if not result["success"]:
            return {
                "healthy": True,
                "unhealthy_deployments": [],
                "error": result.get("error"),
            }

        try:
            deployments_data = json.loads(result["output"])
        except json.JSONDecodeError:
            logger.error("Failed to parse deployments output")
            return {"healthy": True, "unhealthy_deployments": []}

        unhealthy_deployments = []

        for item in deployments_data.get("items", []):
            metadata = item.get("metadata", {})
            spec = item.get("spec", {})
            status = item.get("status", {})

            desired_replicas = spec.get("replicas", 0)
            available_replicas = status.get("availableReplicas", 0)
            ready_replicas = status.get("readyReplicas", 0)
            updated_replicas = status.get("updatedReplicas", 0)

            if available_replicas < desired_replicas or ready_replicas < desired_replicas:
                unhealthy_deployments.append(
                    {
                        "name": metadata.get("name"),
                        "namespace": metadata.get("namespace"),
                        "desired_replicas": desired_replicas,
                        "available_replicas": available_replicas,
                        "ready_replicas": ready_replicas,
                        "updated_replicas": updated_replicas,
                        "conditions": status.get("conditions", []),
                    }
                )

        return {
            "healthy": len(unhealthy_deployments) == 0,
            "total_deployments": len(deployments_data.get("items", [])),
            "unhealthy_deployments": unhealthy_deployments,
        }
