import subprocess
import json
from typing import Dict, Any, List, Optional
from loguru import logger


class KubectlExecutor:
    def __init__(self, kubeconfig_path: str = None, context: str = None):
        self.kubeconfig_path = kubeconfig_path
        self.context = context
        self.env = {}
        if kubeconfig_path:
            self.env["KUBECONFIG"] = kubeconfig_path

    def _inject_flags(self, command: List[str]) -> List[str]:
        """Insert --context after 'kubectl' when a context is set."""
        if not self.context:
            return command
        return [command[0], "--context", self.context] + command[1:]

    def _execute(self, command: List[str]) -> Dict[str, Any]:
        command = self._inject_flags(command)
        try:
            logger.debug(f"Executing kubectl command: {' '.join(command)}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                env={**subprocess.os.environ, **self.env},
                timeout=30,
            )

            if result.returncode != 0:
                logger.warning(
                    f"kubectl command failed: {' '.join(command)}\nError: {result.stderr}"
                )
                return {"success": False, "error": result.stderr.strip()}

            return {"success": True, "output": result.stdout.strip()}

        except subprocess.TimeoutExpired:
            logger.error(f"kubectl command timed out: {' '.join(command)}")
            return {"success": False, "error": "Command timed out after 30 seconds"}
        except FileNotFoundError:
            logger.error("kubectl not found in PATH")
            return {"success": False, "error": "kubectl not found. Please install kubectl and ensure it is in your PATH."}
        except Exception as e:
            logger.error(f"Failed to execute kubectl command: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_connection(self) -> Dict[str, Any]:
        """Quick connectivity check — tells the service exactly what is wrong."""
        result = self._execute(["kubectl", "cluster-info"])
        if result["success"]:
            return {"connected": True}

        err = result.get("error", "")
        if "kubectl not found" in err or "No such file" in err:
            return {
                "connected": False,
                "reason": "kubectl_not_found",
                "message": "kubectl is not installed or not in PATH.",
            }
        if any(kw in err.lower() for kw in ["connection refused", "no such host", "i/o timeout", "unreachable", "tls"]):
            ctx = f" ({self.context})" if self.context else ""
            return {
                "connected": False,
                "reason": "cluster_unreachable",
                "message": f"Cannot connect to Kubernetes cluster{ctx}. Check that the cluster is running and your kubeconfig is correct.",
            }
        if "no configuration" in err.lower() or "kubeconfig" in err.lower():
            return {
                "connected": False,
                "reason": "no_kubeconfig",
                "message": "No kubeconfig found. Set KUBECONFIG_PATH in your .env or ensure ~/.kube/config exists.",
            }
        return {
            "connected": False,
            "reason": "unknown",
            "message": f"Cluster connection failed: {err[:200]}",
        }

    def list_contexts(self) -> Dict[str, Any]:
        """Return all kubeconfig contexts and the current one."""
        contexts_result = self._execute(["kubectl", "config", "get-contexts", "-o", "name"])
        current_result = self._execute(["kubectl", "config", "current-context"])

        contexts = (
            [c.strip() for c in contexts_result["output"].splitlines() if c.strip()]
            if contexts_result["success"]
            else []
        )
        current = current_result["output"].strip() if current_result["success"] else ""
        return {"contexts": contexts, "current": current}

    def get_pods(self, namespace: str = None) -> Dict[str, Any]:
        cmd = ["kubectl", "get", "pods", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        else:
            cmd.append("-A")
        return self._execute(cmd)

    def get_events(self, namespace: str = None) -> Dict[str, Any]:
        cmd = ["kubectl", "get", "events", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        else:
            cmd.append("-A")
        return self._execute(cmd)

    def get_logs(
        self, pod_name: str, namespace: str = "default", tail: int = 100
    ) -> Dict[str, Any]:
        cmd = ["kubectl", "logs", pod_name, "-n", namespace, "--tail", str(tail)]
        return self._execute(cmd)

    def describe_deployment(
        self, deployment_name: str, namespace: str = "default"
    ) -> Dict[str, Any]:
        cmd = ["kubectl", "describe", "deployment", deployment_name, "-n", namespace]
        return self._execute(cmd)

    def get_deployments(self, namespace: str = None) -> Dict[str, Any]:
        cmd = ["kubectl", "get", "deployments", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        else:
            cmd.append("-A")
        return self._execute(cmd)

    def get_services(self, namespace: str = None) -> Dict[str, Any]:
        cmd = ["kubectl", "get", "services", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        else:
            cmd.append("-A")
        return self._execute(cmd)

    def get_endpoints(self, namespace: str = None) -> Dict[str, Any]:
        cmd = ["kubectl", "get", "endpoints", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        else:
            cmd.append("-A")
        return self._execute(cmd)
