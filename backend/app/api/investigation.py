from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from loguru import logger

from app.services.investigation import InvestigationService
from app.core.config import settings
from app.core.kubectl_executor import KubectlExecutor

router = APIRouter(tags=["investigation"])


class InvestigateRequest(BaseModel):
    cluster: Optional[str] = None


class InvestigationResponse(BaseModel):
    status: str
    investigation: Dict[str, Any]
    diagnosis: Optional[Dict[str, Any]] = None


class ClustersResponse(BaseModel):
    clusters: List[str]
    current: str


@router.get("/clusters", response_model=ClustersResponse)
async def list_clusters():
    try:
        kubectl = KubectlExecutor(settings.KUBECONFIG_PATH)
        result = kubectl.list_contexts()
        return {"clusters": result["contexts"], "current": result["current"]}
    except Exception as e:
        logger.error(f"Failed to list clusters: {e}")
        return {"clusters": [], "current": ""}


@router.post("/investigate", response_model=InvestigationResponse)
async def investigate(
    request: InvestigateRequest = Body(default_factory=InvestigateRequest),
):
    cluster = request.cluster if request else None
    logger.info(f"Investigation endpoint called — cluster context: {cluster or 'default'}")
    try:
        service = InvestigationService(cluster=cluster)
        result = await service.run_investigation()
        return {
            "status": "success",
            "investigation": result["investigation"],
            "diagnosis": result["diagnosis"],
        }
    except ConnectionError as e:
        # Raised by the service when the cluster is unreachable
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Investigation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
