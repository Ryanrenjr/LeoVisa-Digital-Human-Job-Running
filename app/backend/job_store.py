import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from schemas import JobCreateRequest

logger = logging.getLogger(__name__)

AI_WORKSPACE = Path("/home/ryanrenjr/AI-Workspace")
JOBS_DIR = AI_WORKSPACE / "jobs"
WINDOWS_DESKTOP_MOUNT = "/mnt/c/Users/rjxxx/Desktop/DigitalHumanOutput"


def _now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _job_path(job_id: str) -> Path:
    return JOBS_DIR / job_id / "job.json"


def load_job(job_id: str) -> Optional[dict]:
    p = _job_path(job_id)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def save_job(job: dict) -> None:
    job_id = job["job_id"]
    p = _job_path(job_id)
    p.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")


def list_jobs() -> list:
    jobs = []
    for job_json in JOBS_DIR.glob("*/job.json"):
        try:
            j = json.loads(job_json.read_text(encoding="utf-8"))
            jobs.append(j)
        except Exception as e:
            logger.warning("Skipping unreadable job.json: %s — %s", job_json, e)
    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return jobs


def get_running_job() -> Optional[dict]:
    for j in list_jobs():
        if j.get("status") == "running":
            return j
    return None


def _build_paths(job_id: str) -> dict:
    job_dir = JOBS_DIR / job_id
    return {
        "job_dir": str(job_dir),
        "input_dir": str(job_dir / "input"),
        "output_dir": str(job_dir / "output"),
        "log_dir": str(job_dir / "logs"),
        "title_txt": str(job_dir / "input/title.txt"),
        "subtitle_txt": str(job_dir / "input/subtitle.txt"),
        "keywords_txt": str(job_dir / "input/keywords.txt"),
        "script_txt": str(job_dir / "input/script.txt"),
        "voice_wav": str(job_dir / "output/voice.wav"),
        "voice_for_latentsync_wav": str(job_dir / "output/voice_for_latentsync.wav"),
        "clean_video": str(job_dir / "output/clean_video.mp4"),
        "final_video": None,
        "run_log": str(job_dir / "logs/run.log"),
        "windows_desktop_output": f"{WINDOWS_DESKTOP_MOUNT}/{job_id}_clean_video.mp4",
    }


def _normalize_keywords(raw) -> list:
    if isinstance(raw, list):
        return [str(k).strip() for k in raw if str(k).strip()]
    return [k.strip() for k in re.split(r"[,\n、，]", str(raw)) if k.strip()]


def create_job(req: JobCreateRequest) -> dict:
    job_id = f"{_now_stamp()}_video_job"
    job_dir = JOBS_DIR / job_id

    for subdir in ("input", "output", "logs"):
        (job_dir / subdir).mkdir(parents=True, exist_ok=True)

    job = {
        "job_id": job_id,
        "status": "pending",
        "title": req.title,
        "subtitle": req.subtitle,
        "keywords": _normalize_keywords(req.keywords),
        "script": req.script,
        "background_id": req.background_id,
        "voice_id": "boss_voxcpm2_lora",
        "output_type": req.output_type,
        "shutdown_after_done": req.shutdown_after_done,
        "created_at": _now_iso(),
        "started_at": None,
        "finished_at": None,
        "error_message": None,
        "progress": {
            "stage": "pending",
            "current_window": 0,
            "total_windows": 0,
            "percent": 0,
            "message": "Waiting to start",
        },
        "paths": _build_paths(job_id),
    }

    save_job(job)
    return job
