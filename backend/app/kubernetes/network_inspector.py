import json
from typing import Dict, Any
from loguru import logger


class NetworkInspector:
    def __init__(self, kubectl_executor):
        self.kubectl = kubectl_executor

    def inspect(self) -> Dict[str, Any]:
        logger.info("Inspecting network configuration")

        services = self._inspect_services()
        endpoints = self._inspect_endpoints()

        network_issues = self._find_network_issues(services, endpoints)

        return {
            "services": services,
            "endpoints": endpoints,
            "issues": network_issues,
        }

    def _inspect_services(self) -> Dict[str, Any]:
        result = self.kubectl.get_services()

        if not result["success"]:
            return {"error": result.get("error")}

        try:
            services_data = json.loads(result["output"])
            return {
                "total": len(services_data.get("items", [])),
                "services": [
                    {
                        "name": svc.get("metadata", {}).get("name"),
                        "namespace": svc.get("metadata", {}).get("namespace"),
                        "type": svc.get("spec", {}).get("type"),
                        "selector": svc.get("spec", {}).get("selector"),
                        "port": svc.get("spec", {}).get("ports", [{}])[0].get(
                            "port"
                        ),
                    }
                    for svc in services_data.get("items", [])
                ],
            }
        except json.JSONDecodeError:
            logger.error("Failed to parse services output")
            return {"error": "Parse error"}

    def _inspect_endpoints(self) -> Dict[str, Any]:
        result = self.kubectl.get_endpoints()

        if not result["success"]:
            return {"error": result.get("error")}

        try:
            endpoints_data = json.loads(result["output"])
            return {
                "total": len(endpoints_data.get("items", [])),
                "endpoints": [
                    {
                        "name": ep.get("metadata", {}).get("name"),
                        "namespace": ep.get("metadata", {}).get("namespace"),
                        "addresses": len(ep.get("subsets", [{}])[0].get("addresses", []))
                        if ep.get("subsets")
                        else 0,
                    }
                    for ep in endpoints_data.get("items", [])
                ],
            }
        except json.JSONDecodeError:
            logger.error("Failed to parse endpoints output")
            return {"error": "Parse error"}

    def _find_network_issues(
        self, services: Dict[str, Any], endpoints: Dict[str, Any]
    ) -> list:
        issues = []

        if "services" not in services or "endpoints" not in endpoints:
            return issues

        service_map = {svc["name"]: svc for svc in services.get("services", [])}
        endpoint_map = {ep["name"]: ep for ep in endpoints.get("endpoints", [])}

        for svc_name, svc in service_map.items():
            if svc_name not in endpoint_map:
                continue

            endpoint = endpoint_map[svc_name]
            if endpoint["addresses"] == 0 and svc["type"] != "ExternalName":
                issues.append(
                    {
                        "type": "NoEndpoints",
                        "service": svc_name,
                        "namespace": svc["namespace"],
                        "message": f"Service {svc_name} has no endpoints",
                    }
                )

        return issues
