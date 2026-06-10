#!/usr/bin/env python3
"""
prepare_job.py — LeoVisa Digital Human Job Runner V1
Usage: python prepare_job.py JOB_ID
"""

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

AI_WORKSPACE = Path("/home/ryanrenjr/AI-Workspace")

INPUT_DIR = AI_WORKSPACE / "DigitalHumanInput"
OUTPUT_DIR = AI_WORKSPACE / "DigitalHumanOutput"
JOBS_DIR = AI_WORKSPACE / "jobs"
BACKGROUNDS_JSON = AI_WORKSPACE / "app/config/backgrounds.json"
BOSS_DEFAULT = AI_WORKSPACE / "VideoRefs/boss/default/boss_default.mp4"

WINDOWS_DESKTOP = "C:\\Users\\rjxxx\\Desktop\\DigitalHumanOutput"


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def fail_job(job_path: Path | None, msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr)
    if job_path and job_path.exists():
        try:
            job = load_json(job_path)
            job["status"] = "failed"
            job["error_message"] = msg
            job.setdefault("progress", {})
            job["progress"]["stage"] = "failed"
            job["progress"]["message"] = msg
            save_json(job_path, job)
            print(f"[INFO] job.json updated: status=failed")
        except Exception as e:
            print(f"[WARN] Could not update job.json after failure: {e}", file=sys.stderr)
    sys.exit(1)


def validate_job(job: dict, job_id: str) -> None:
    required = ["job_id", "title", "subtitle", "keywords", "script",
                "background_id", "voice_id", "output_type"]
    for field in required:
        v = job.get(field)
        if v is None or v == "" or v == []:
            raise ValueError(f"Required field missing or empty: {field}")

    if job["job_id"] != job_id:
        raise ValueError(
            f"job_id mismatch: job.json has '{job['job_id']}', expected '{job_id}'"
        )

    status = job.get("status", "")
    if status in ("running", "finished"):
        raise ValueError(
            f"Job status is '{status}'. Only pending/failed/cancelled jobs can be prepared."
        )

    if job["output_type"] != "clean_video":
        raise ValueError(
            f"output_type '{job['output_type']}' is not supported. "
            f"final_video is not implemented in V1."
        )

    if job["voice_id"] != "boss_voxcpm2_lora":
        raise ValueError(
            f"voice_id '{job['voice_id']}' is not supported in V1. "
            f"Only boss_voxcpm2_lora is allowed."
        )

    if not isinstance(job["keywords"], list) or not all(
        isinstance(k, str) for k in job["keywords"]
    ):
        raise ValueError("keywords must be a list of strings.")


def resolve_background(background_id: str) -> Path:
    if not BACKGROUNDS_JSON.exists():
        raise FileNotFoundError(f"backgrounds.json not found: {BACKGROUNDS_JSON}")
    backgrounds = json.loads(BACKGROUNDS_JSON.read_text(encoding="utf-8"))
    for bg in backgrounds:
        if bg["id"] == background_id:
            p = Path(bg["path"])
            if not p.exists():
                raise FileNotFoundError(
                    f"Background file not found: {p} (id={background_id})"
                )
            return p
    raise ValueError(
        f"background_id '{background_id}' not found in backgrounds.json. "
        f"Available: {[b['id'] for b in backgrounds]}"
    )


def backup_input_files(stamp: str) -> None:
    for name in ("title.txt", "subtitle.txt", "keywords.txt", "script.txt"):
        src = INPUT_DIR / name
        if src.exists():
            dst = INPUT_DIR / f"{name}.bak_prepare_{stamp}"
            shutil.copy2(src, dst)
            print(f"[INFO] Backed up: {src.name} -> {dst.name}")


def write_input_files(job: dict, job_input_dir: Path) -> None:
    keywords_text = "\n".join(job["keywords"])

    pairs = [
        ("title.txt", job["title"]),
        ("subtitle.txt", job["subtitle"]),
        ("keywords.txt", keywords_text),
        ("script.txt", job["script"]),
    ]

    for name, content in pairs:
        for dest_dir in (INPUT_DIR, job_input_dir):
            path = dest_dir / name
            path.write_text(content, encoding="utf-8")
        print(f"[INFO] Written: {name} -> DigitalHumanInput/ and job input/")


def switch_background(background_id: str, job_id: str, bg_src: Path, stamp: str) -> None:
    if BOSS_DEFAULT.exists():
        backup_name = f"boss_default_backup_prepare_{job_id}_{stamp}.mp4"
        backup_path = BOSS_DEFAULT.parent / backup_name
        shutil.copy2(BOSS_DEFAULT, backup_path)
        print(f"[INFO] Backed up boss_default.mp4 -> {backup_name}")

    shutil.copy2(bg_src, BOSS_DEFAULT)
    print(f"[INFO] Background switched: {background_id} ({bg_src.name}) -> boss_default.mp4")


def clean_old_outputs() -> None:
    files_to_remove = [
        "clean_video.mp4",
        "final_video.mp4",
        "main_video_no_endcard.mp4",
        "main_video_trimmed.mp4",
        "voice.wav",
        "voice_for_latentsync.wav",
        "captions.json",
        "video_config.json",
    ]
    dirs_to_remove = [
        "audio_segments",
        "audio_segments_original_speed",
    ]

    for name in files_to_remove:
        p = OUTPUT_DIR / name
        if p.exists():
            p.unlink()
            print(f"[INFO] Removed old output file: {name}")

    for name in dirs_to_remove:
        p = OUTPUT_DIR / name
        if p.exists():
            shutil.rmtree(p)
            print(f"[INFO] Removed old output dir: {name}")


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
        "windows_desktop_output": f"{WINDOWS_DESKTOP}\\{job_id}_clean_video.mp4",
    }


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python prepare_job.py JOB_ID", file=sys.stderr)
        sys.exit(1)

    job_id = sys.argv[1]
    job_path = JOBS_DIR / job_id / "job.json"

    print(f"[INFO] ========================================")
    print(f"[INFO] prepare_job.py — LeoVisa Job Runner V1")
    print(f"[INFO] Job ID : {job_id}")
    print(f"[INFO] Job    : {job_path}")
    print(f"[INFO] ========================================")

    if not job_path.exists():
        fail_job(None, f"job.json not found: {job_path}")

    try:
        job = load_json(job_path)
    except Exception as e:
        fail_job(None, f"Failed to parse job.json: {e}")

    # --- Validate ---
    print(f"[INFO] Validating job fields...")
    try:
        validate_job(job, job_id)
    except ValueError as e:
        fail_job(job_path, str(e))

    print(f"[INFO] Validation passed.")
    print(f"[INFO]   title        : {job['title']}")
    print(f"[INFO]   subtitle     : {job['subtitle']}")
    print(f"[INFO]   background_id: {job['background_id']}")
    print(f"[INFO]   voice_id     : {job['voice_id']}")
    print(f"[INFO]   output_type  : {job['output_type']}")
    print(f"[INFO]   keywords     : {job['keywords']}")

    # --- Resolve background ---
    try:
        bg_src = resolve_background(job["background_id"])
    except (FileNotFoundError, ValueError) as e:
        fail_job(job_path, str(e))

    print(f"[INFO] Background resolved: {bg_src}")

    stamp = now_stamp()

    # --- Create job directory structure ---
    job_dir = JOBS_DIR / job_id
    for subdir in ("input", "output", "logs"):
        (job_dir / subdir).mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Job directories ensured: {job_dir}/{{input,output,logs}}")

    # --- Backup current workspace input files ---
    print(f"[INFO] Backing up DigitalHumanInput/ files...")
    try:
        backup_input_files(stamp)
    except Exception as e:
        fail_job(job_path, f"Failed to backup input files: {e}")

    # --- Write input files ---
    print(f"[INFO] Writing input files...")
    try:
        write_input_files(job, job_dir / "input")
    except Exception as e:
        fail_job(job_path, f"Failed to write input files: {e}")

    # --- Switch background ---
    print(f"[INFO] Switching background to: {job['background_id']}")
    try:
        switch_background(job["background_id"], job_id, bg_src, stamp)
    except Exception as e:
        fail_job(job_path, f"Failed to switch background: {e}")

    # --- Clean old outputs ---
    print(f"[INFO] Cleaning old DigitalHumanOutput/ files...")
    try:
        clean_old_outputs()
    except Exception as e:
        fail_job(job_path, f"Failed to clean old outputs: {e}")

    # --- Update job.json ---
    print(f"[INFO] Updating job.json...")
    try:
        job["status"] = "running"
        if not job.get("started_at"):
            job["started_at"] = now_iso()
        job["error_message"] = None
        job.setdefault("progress", {})
        job["progress"]["stage"] = "prepared"
        job["progress"]["current_window"] = 0
        job["progress"]["total_windows"] = 0
        job["progress"]["percent"] = 0
        job["progress"]["message"] = "Job prepared successfully"
        job["paths"] = build_paths(job_id)
        save_json(job_path, job)
    except Exception as e:
        fail_job(job_path, f"Failed to update job.json: {e}")

    print(f"[INFO] ========================================")
    print(f"[INFO] prepare_job.py DONE")
    print(f"[INFO] status    : {job['status']}")
    print(f"[INFO] stage     : {job['progress']['stage']}")
    print(f"[INFO] started_at: {job['started_at']}")
    print(f"[INFO] ========================================")


if __name__ == "__main__":
    main()
