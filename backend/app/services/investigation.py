from typing import Dict, Any, Optional
from loguru import logger

from app.core.config import settings
from app.core.kubectl_executor import KubectlExecutor
from app.kubernetes.pod_inspector import PodInspector
from app.kubernetes.logs_collector import LogsCollector
from app.kubernetes.events_analyzer import EventsAnalyzer
from app.kubernetes.deployment_inspector import DeploymentInspector
from app.kubernetes.network_inspector import NetworkInspector
from app.ai import reasoning


HEALTHY_DIAGNOSIS = {
    "root_cause": "No critical issues detected",
    "explanation": "All pods are running correctly and no critical Kubernetes events were found.",
    "fix": "No action required. The cluster appears to be healthy.",
    "kubectl_command": "kubectl get pods -A",
    "prevention": "Continue regular monitoring. Consider setting up alerts for pod failures.",
    "confidence": 100,
    "is_healthy": True,
}


class InvestigationService:
    def __init__(self, cluster: Optional[str] = None):
        self.kubectl = KubectlExecutor(settings.KUBECONFIG_PATH, context=cluster)
        self.pod_inspector = PodInspector(self.kubectl)
        self.logs_collector = LogsCollector(self.kubectl)
        self.events_analyzer = EventsAnalyzer(self.kubectl)
        self.deployment_inspector = DeploymentInspector(self.kubectl)
        self.network_inspector = NetworkInspector(self.kubectl)

    async def run_investigation(self) -> Dict[str, Any]:
        logger.info("Starting Kubernetes investigation")

        # Fail fast with a friendly error if the cluster is not reachable
        connection = self.kubectl.check_connection()
        if not connection["connected"]:
            raise ConnectionError(connection["message"])

        investigation = {
            "pods": self.pod_inspector.inspect(),
            "events": self.events_analyzer.analyze(),
            "deployments": self.deployment_inspector.inspect(),
            "network": self.network_inspector.inspect(),
        }

        pods_healthy = investigation["pods"].get("healthy", True)
        has_critical_events = bool(investigation["events"].get("critical_events"))

        # Short-circuit: skip AI call when cluster is clearly healthy
        if pods_healthy and not has_critical_events:
            investigation["logs"] = {}
            logger.info("Cluster is healthy — skipping AI call")
            return {"investigation": investigation, "diagnosis": HEALTHY_DIAGNOSIS}

        investigation["logs"] = self.logs_collector.collect(
            investigation["pods"].get("problematic_pods", [])
        )

        logger.info("Investigation completed, starting AI analysis")
        diagnosis = await reasoning.analyze(investigation)

        return {"investigation": investigation, "diagnosis": diagnosis}
