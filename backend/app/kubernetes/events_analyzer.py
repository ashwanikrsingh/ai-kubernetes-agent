import json
from typing import Dict, Any, List
from datetime import datetime, timedelta
from loguru import logger

CRITICAL_EVENT_TYPES = {
    "FailedScheduling",
    "BackOff",
    "FailedMount",
    "FailedPull",
    "ErrImagePull",
    "Unhealthy",
    "Failed",
    "NotReady",
    "NodeNotReady",
    "KubeletNotReady",
}


class EventsAnalyzer:
    def __init__(self, kubectl_executor):
        self.kubectl = kubectl_executor

    def analyze(self) -> Dict[str, Any]:
        logger.info("Analyzing Kubernetes events")
        result = self.kubectl.get_events()

        if not result["success"]:
            return {"critical_events": [], "error": result.get("error")}

        try:
            events_data = json.loads(result["output"])
        except json.JSONDecodeError:
            logger.error("Failed to parse events output")
            return {"critical_events": []}

        critical_events = []
        now = datetime.utcnow()
        recent_threshold = now - timedelta(minutes=30)

        for item in events_data.get("items", []):
            event_type = item.get("type", "")
            reason = item.get("reason", "")
            message = item.get("message", "")
            first_timestamp = item.get("firstTimestamp", "")

            try:
                event_time = datetime.fromisoformat(first_timestamp.replace("Z", "+00:00"))
            except:
                event_time = now

            if reason in CRITICAL_EVENT_TYPES and event_time > recent_threshold:
                involved_object = item.get("involvedObject", {})
                critical_events.append(
                    {
                        "type": event_type,
                        "reason": reason,
                        "message": message,
                        "namespace": involved_object.get("namespace"),
                        "object_name": involved_object.get("name"),
                        "object_kind": involved_object.get("kind"),
                        "timestamp": first_timestamp,
                    }
                )

        return {
            "critical_events": critical_events,
            "total_events": len(events_data.get("items", [])),
        }
