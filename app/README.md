# LeoVisa Digital Human Job Runner
## 李尔王数字人视频生成器

**Version:** 0.1.2 — CleanVideo Local Console V1.2  
**Status:** Working  
**Last updated:** 2026-06-10

---

## 功能说明

### V1 基础功能
- 输入标题、副标题、关键词、文案
- 选择 boss_01 ~ boss_04 背景视频
- 生成 CleanVideo（口型同步人像视频，无字幕、无 BGM）
- 查看任务列表（实时 5s 轮询）
- 查看运行日志（最近 200 行）
- 输出到 `jobs/JOB_ID/output/`
- 输出到 Windows 桌面 `DigitalHumanOutput/`
- 可选：任务完成后自动关机

### V1.1 新增
- Cancel / Reset stale job（卡住的 running 任务处理）
- 动态任务进度（voice_generation / latentsync / collecting_output）
- LatentSync Window X/Y 进度显示

### V1.2 新增
- **Preview** — 在浏览器内直接预览 finished CleanVideo
- **Download** — 直接下载 clean_video.mp4
- **Copy Windows path** — 复制 Windows Desktop 输出路径
- **Delete job** — 从 UI 删除任务（含 input/output/logs）
- **How to Use guide** — 首页 5 步使用流程说明
- **Imperial College 风格 UI** — 全面升级的学术专业界面
- **中英文切换** — Header 语言切换按钮，localStorage 持久化

---

## 系统架构

```
React Frontend (Vite, port 5173)
        │
        │ HTTP
        ▼
FastAPI Backend (uvicorn, port 8008)
        │
        │ subprocess (bash)
        ▼
run_cleanvideo_job.sh
        │
        ├── prepare_job.py               # 切换背景、写入输入文件
        ├── VoxCPM2 (conda: voxcpm)      # 中文语音克隆
        ├── LatentSync (conda: latentsync)  # 口型同步
        └── collect_output.py            # 收集输出、拷贝到 Windows Desktop

Job Storage:    ~/AI-Workspace/jobs/JOB_ID/job.json
Progress:       ~/AI-Workspace/app/backend/progress_utils.py（动态注入，不写磁盘）
Translations:   ~/AI-Workspace/app/frontend/src/translations.js
```

---

## 关键目录说明

| 目录 | 说明 |
|------|------|
| `~/AI-Workspace/app/backend/` | FastAPI 后端、Python 脚本 |
| `~/AI-Workspace/app/frontend/` | React + Vite 前端 |
| `~/AI-Workspace/app/config/` | backgrounds.json、job_schema.md |
| `~/AI-Workspace/jobs/` | 所有任务 JSON 和输出文件 |
| `~/AI-Workspace/assets/backgrounds/` | boss_01~04 背景视频素材 |
| `~/AI-Workspace/DigitalHumanInput/` | 当前任务输入（被 prepare_job.py 覆写） |
| `~/AI-Workspace/DigitalHumanOutput/` | 当前任务原始输出（被下一个任务清空） |
| `~/AI-Workspace/scripts/` | run_cleanvideo_job.sh 及辅助脚本 |

---

## 启动方式

### 后端

```bash
source ~/miniconda3/etc/profile.d/conda.sh
conda activate base
cd ~/AI-Workspace/app/backend
uvicorn main:app --host 127.0.0.1 --port 8008 --reload
```

### 前端

```bash
cd ~/AI-Workspace/app/frontend
npm run dev
```

### 访问

```
http://127.0.0.1:5173
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 后端健康检查 |
| GET | `/backgrounds` | 获取背景列表 |
| POST | `/jobs` | 创建新任务 |
| GET | `/jobs` | 获取所有任务（含动态 progress + artifacts） |
| GET | `/jobs/{job_id}` | 获取单个任务（含动态 progress + artifacts） |
| POST | `/jobs/{job_id}/run` | 启动任务 |
| POST | `/jobs/{job_id}/cancel` | 取消任务 |
| POST | `/jobs/{job_id}/reset` | 重置为 pending |
| DELETE | `/jobs/{job_id}` | 永久删除任务 |
| GET | `/jobs/{job_id}/log` | 获取运行日志（最近 200 行） |
| GET | `/jobs/{job_id}/download` | 下载 / 流式播放 clean_video.mp4 |

### Cancel / Reset 规则

- `cancel`：`finished` 任务 → 400；真实运行进程 → 409
- `reset`：`finished` 任务 → 400；真实运行进程 → 409；`pending` → 200 no-op
- `delete`：真实运行进程 → 409；其余状态均可删除

---

## Artifacts 字段

`GET /jobs` 和 `GET /jobs/{job_id}` 在返回数据中动态注入 `artifacts` 字段：

```json
"artifacts": {
  "clean_video_exists": true,
  "download_url": "/jobs/JOB_ID/download",
  "preview_url":  "/jobs/JOB_ID/download"
}
```

- `clean_video_exists`：`jobs/JOB_ID/output/clean_video.mp4` 是否存在
- `download_url` / `preview_url`：不存在时为 `null`
- 注入逻辑在内存中计算，不写回 job.json

---

## 动态进度说明

running 任务通过文件系统实时计算：

| stage | percent | 触发条件 |
|-------|---------|---------|
| `voice_generation` | 5% | `voice_for_latentsync.wav` 尚未生成 |
| `latentsync` | 10%~95% | wav 存在，`core_*.mp4` 数量递增 |
| `collecting_output` | 95% | `clean_video.mp4` 已存在，job 尚未 finished |
| `finished` | 100% | job.status = finished |

LatentSync 阶段显示：`Window current / total`

---

## 中英文切换

- Header 右上角显示 `EN / 中` 切换按钮
- 默认语言：英文（`en`）
- 语言选择保存到 `localStorage("leovisa_language")`，刷新页面后保持
- 覆盖范围：表单 label、按钮、使用流程、任务队列、任务详情、提示文案

---

## 输出路径说明

**WSL 内部：**
```
~/AI-Workspace/jobs/JOB_ID/output/clean_video.mp4
~/AI-Workspace/jobs/JOB_ID/output/voice.wav
~/AI-Workspace/jobs/JOB_ID/logs/run.log
```

**Windows 桌面：**
```
C:\Users\rjxxx\Desktop\DigitalHumanOutput\JOB_ID_clean_video.mp4
```

---

## 注意事项

- **同一时间只能运行一个任务**
- CleanVideo 不包含字幕、BGM、Remotion 包装
- `shutdown_after_done` 只有任务 `finished` 后才会触发
- 取消关机：`shutdown /a`
- `DigitalHumanOutput/` 每次任务开始前清空
- 删除任务不可撤销

---

## 快速测试

```bash
# 创建测试任务
cd ~/AI-Workspace/app/backend
python3 create_test_job.py

# 手动运行
bash ~/AI-Workspace/scripts/run_cleanvideo_job.sh JOB_ID

# 查看实时 progress（含 artifacts）
curl -s http://127.0.0.1:8008/jobs/JOB_ID | python3 -m json.tool | grep -E '"stage"|"percent"|"clean_video_exists"'
```
