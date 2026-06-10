#!/usr/bin/env python3
"""
create_test_job.py — LeoVisa Digital Human Job Runner V1
Creates a test job for validating the CleanVideo pipeline.
Usage: python3 create_test_job.py
"""

import json
from datetime import datetime
from pathlib import Path

AI_WORKSPACE = Path("/home/ryanrenjr/AI-Workspace")
JOBS_DIR = AI_WORKSPACE / "jobs"
WINDOWS_DESKTOP = "C:\\Users\\rjxxx\\Desktop\\DigitalHumanOutput"


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def build_paths(job_id: str) -> dict:
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
        "windows_desktop_output": f"/mnt/c/Users/rjxxx/Desktop/DigitalHumanOutput/{job_id}_clean_video.mp4",
    }


def main() -> None:
    job_id = f"{now_stamp()}_test_ilr"
    job_dir = JOBS_DIR / job_id

    for subdir in ("input", "output", "logs"):
        (job_dir / subdir).mkdir(parents=True, exist_ok=True)

    job = {
        "job_id": job_id,
        "status": "pending",
        "title": "永居改革没落地",
        "subtitle": "没落地，不等于不来了",
        "keywords": ["永居改革", "五年永居", "十年永居", "ILR", "李尔王"],
        "script": "永居改革，到今天还没落地。很多人觉得，那可以松口气了。但李尔王想跟你说：没落地，不等于不来了。安全感，要靠自己的时间线，不是靠等一条新闻。我是李尔王，我们下期见。",
        "background_id": "boss_03",
        "voice_id": "boss_voxcpm2_lora",
        "output_type": "clean_video",
        "shutdown_after_done": False,
        "created_at": now_iso(),
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
        "paths": build_paths(job_id),
    }

    job_json_path = job_dir / "job.json"
    job_json_path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")

    run_cmd = f"bash /home/ryanrenjr/AI-Workspace/scripts/run_cleanvideo_job.sh {job_id}"
    log_cmd = f"tail -f /home/ryanrenjr/AI-Workspace/jobs/{job_id}/logs/run.log"

    print(f"Created test job: {job_id}")
    print(f"Job path: {job_dir}")
    print(f"Run command:")
    print(f"  {run_cmd}")
    print(f"Log command:")
    print(f"  {log_cmd}")


if __name__ == "__main__":
    main()
