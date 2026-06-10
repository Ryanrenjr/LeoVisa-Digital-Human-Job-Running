# Job Schema V1 — LeoVisa Digital Human Job Runner

## Overview

每一个视频生成任务称为一个 **job**。每个 job 有唯一的 `job_id`，对应 `~/AI-Workspace/jobs/<job_id>/` 目录。

V1 只支持 `output_type: clean_video`。

---

## 目录结构

```
jobs/<job_id>/
├── job.json
├── input/
│   ├── title.txt
│   ├── subtitle.txt
│   ├── keywords.txt
│   └── script.txt
├── output/
│   ├── voice.wav
│   ├── voice_for_latentsync.wav
│   └── clean_video.mp4
└── logs/
    └── run.log
```

---

## 字段说明

### job_id
- **类型**：string
- **格式**：`YYYYMMDD_HHMMSS_<slug>`，例如 `20260609_153012_test_ilr`
- **说明**：全局唯一，同时作为 jobs/ 下的目录名。

---

### status
- **类型**：string (enum)
- **可选值**：
  - `pending` — 已创建，等待执行
  - `running` — 正在执行
  - `finished` — 成功完成
  - `failed` — 执行失败
  - `cancelled` — 已取消

---

### title
- **类型**：string
- **说明**：视频主标题，对应 `input/title.txt`。

---

### subtitle
- **类型**：string
- **说明**：视频副标题，对应 `input/subtitle.txt`。

---

### keywords
- **类型**：array of strings
- **说明**：关键词列表，对应 `input/keywords.txt`（写入时每行一个关键词）。

---

### script
- **类型**：string
- **说明**：完整口播文案，对应 `input/script.txt`。同时保存在 job.json 中便于元数据检索。

---

### background_id
- **类型**：string (enum)
- **可选值**：`boss_01`、`boss_02`、`boss_03`、`boss_04`
- **说明**：指定 LatentSync 使用的背景视频，对应 `app/config/backgrounds.json` 中的 id 字段。执行时将 `assets/backgrounds/<id>.mp4` 复制至 `VideoRefs/boss/default/boss_default.mp4`。

---

### voice_id
- **类型**：string
- **V1 固定值**：`boss_voxcpm2_lora`
- **说明**：语音克隆模型标识，V1 只支持该值。未来扩展时可支持其他角色或模型。

---

### output_type
- **类型**：string (enum)
- **可选值**：
  - `clean_video` — 只生成口型对齐视频（V1 已实现）
  - `final_video` — 含字幕/BGM/片尾的完整视频（V1 保留字段，未实现）

---

### shutdown_after_done
- **类型**：boolean
- **默认值**：`false`
- **说明**：任务完成后是否关机。`true` 时执行 `sudo shutdown -h now`，适用于夜间无人值守生成。

---

### created_at
- **类型**：string (ISO 8601)
- **格式**：`YYYY-MM-DDTHH:MM:SS`，例如 `2026-06-09T15:30:12`
- **说明**：job 创建时间。

---

### started_at
- **类型**：string (ISO 8601) | null
- **说明**：job 开始执行时间。未开始时为 `null`。

---

### finished_at
- **类型**：string (ISO 8601) | null
- **说明**：job 完成（成功或失败）时间。未完成时为 `null`。

---

### error_message
- **类型**：string | null
- **说明**：失败时记录错误信息；正常情况下为 `null`。

---

### progress
- **类型**：object
- **结构**：
```json
{
  "stage": "pending",
  "current_window": 0,
  "total_windows": 0,
  "percent": 0,
  "message": "Waiting to start"
}
```
- **字段说明**：
  - `stage`：当前执行阶段（见下方枚举）
  - `current_window`：LatentSync 当前处理的窗口序号（0 表示未开始）
  - `total_windows`：LatentSync 总窗口数（由音频时长和 CORE_SECONDS=6 决定）
  - `percent`：整体进度 0–100
  - `message`：当前阶段描述文字
- **stage 可选值**：
  - `pending` — 等待开始
  - `prepared` — 输入文件已就绪
  - `voice_generation` — VoxCPM2 生成语音中
  - `voice_postprocess` — 语音后处理中
  - `latentsync` — LatentSync 口型对齐中
  - `collecting_output` — 收集输出文件至 job output/
  - `finished` — 完成
  - `failed` — 失败
  - `cancelled` — 已取消

---

### paths
- **类型**：object
- **说明**：job 相关的所有绝对路径，由 runner 在任务创建时自动填充。
- **结构**：
```json
{
  "job_dir": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>",
  "input_dir": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/input",
  "output_dir": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/output",
  "log_dir": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/logs",
  "title_txt": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/input/title.txt",
  "subtitle_txt": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/input/subtitle.txt",
  "keywords_txt": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/input/keywords.txt",
  "script_txt": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/input/script.txt",
  "voice_wav": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/output/voice.wav",
  "voice_for_latentsync_wav": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/output/voice_for_latentsync.wav",
  "clean_video": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/output/clean_video.mp4",
  "final_video": null,
  "run_log": "/home/ryanrenjr/AI-Workspace/jobs/<job_id>/logs/run.log",
  "windows_desktop_output": "C:\\Users\\rjxxx\\Desktop\\DigitalHumanOutput\\<job_id>_clean_video.mp4"
}
```
- **注意**：`final_video` 在 V1 中为 `null`。`windows_desktop_output` 通过 `/mnt/c/` 写入 Windows 桌面。

---

## 完整空骨架

```json
{
  "job_id": "",
  "status": "pending",
  "title": "",
  "subtitle": "",
  "keywords": [],
  "script": "",
  "background_id": "boss_01",
  "voice_id": "boss_voxcpm2_lora",
  "output_type": "clean_video",
  "shutdown_after_done": false,
  "created_at": "",
  "started_at": null,
  "finished_at": null,
  "error_message": null,
  "progress": {
    "stage": "pending",
    "current_window": 0,
    "total_windows": 0,
    "percent": 0,
    "message": "Waiting to start"
  },
  "paths": {
    "job_dir": "",
    "input_dir": "",
    "output_dir": "",
    "log_dir": "",
    "title_txt": "",
    "subtitle_txt": "",
    "keywords_txt": "",
    "script_txt": "",
    "voice_wav": "",
    "voice_for_latentsync_wav": "",
    "clean_video": "",
    "final_video": null,
    "run_log": "",
    "windows_desktop_output": ""
  }
}
```
