from typing import List, Optional, Union

from pydantic import BaseModel


class JobCreateRequest(BaseModel):
    title: str
    subtitle: str
    keywords: Union[List[str], str]
    script: str
    background_id: str
    output_type: str = "clean_video"
    shutdown_after_done: bool = False


class JobRunResponse(BaseModel):
    message: str
    job_id: str
    pid: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
