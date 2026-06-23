from typing import Dict, Any, List
from loguru import logger


class LogsCollector:
    def __init__(self, kubectl_executor):
        self.kubectl = kubectl_executor

    def collect(self, problematic_pods: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(f"Collecting logs for {len(problematic_pods)} problematic pods")

        logs_data = {}

        for pod in problematic_pods[:10]:
            pod_key = f"{pod['namespace']}/{pod['name']}"
            result = self.kubectl.get_logs(pod["name"], pod["namespace"], tail=50)

            if result["success"]:
                logs_data[pod_key] = self._extract_relevant_logs(result["output"])
            else:
                logs_data[pod_key] = {"error": result.get("error")}

        return logs_data

    def _extract_relevant_logs(self, logs: str) -> Dict[str, Any]:
        lines = logs.split("\n")
        error_indicators = [
            "error",
            "exception",
            "failed",
            "timeout",
            "crash",
            "panic",
            "fatal",
            "cannot",
        ]

        relevant_lines = []
        for line in lines:
            if any(indicator in line.lower() for indicator in error_indicators):
                relevant_lines.append(line)

        return {
            "total_lines": len(lines),
            "relevant_errors": relevant_lines[-20:] if relevant_lines else [],
            "last_lines": lines[-10:],
        }
