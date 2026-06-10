#!/bin/bash
set -e

echo "===================================="
echo "Step 2 SEGMENT-LOCKED FAST WITH GAPS"
echo "Generate digital human video by voiceSegments + preserve pauses"
echo "===================================="

cd ~/AI-Workspace/projects/LatentSync

source ~/miniconda3/etc/profile.d/conda.sh
conda activate latentsync

FPS=25
PAD_SECONDS=0.25

WORK_DIR="data/segment_locked_work"
INPUT_AUDIO="data/input/voice_for_latentsync.wav"
RAW_BOSS_VIDEO="data/input/boss_default.mp4"
FULL_LOOP_VIDEO="$WORK_DIR/boss_full_loop_fast.mp4"
CAPTIONS_JSON="$HOME/AI-Workspace/DigitalHumanOutput/captions.json"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
mkdir -p data/input

rm -f ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4
rm -f ~/AI-Workspace/DigitalHumanOutput/main_video_no_endcard.mp4
rm -f ~/AI-Workspace/DigitalHumanOutput/main_video_trimmed.mp4
rm -f ~/AI-Workspace/DigitalHumanOutput/final_video.mp4

cp ~/AI-Workspace/DigitalHumanOutput/voice_for_latentsync.wav "$INPUT_AUDIO"
cp ~/AI-Workspace/VideoRefs/boss/default/boss_default.mp4 "$RAW_BOSS_VIDEO"

AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$INPUT_AUDIO")
echo "Full audio duration: $AUDIO_DUR seconds"

echo "Creating full loop boss video..."
ffmpeg -y -stream_loop -1 -i "$RAW_BOSS_VIDEO" \
  -t "$AUDIO_DUR" \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=${FPS},setsar=1" \
  -c:v libx264 -crf 23 -preset veryfast \
  -pix_fmt yuv420p \
  -an \
  "$FULL_LOOP_VIDEO"

echo "Creating segment metadata and padded source chunks..."

python3 <<PY
import json
import subprocess
from pathlib import Path

fps = int("$FPS")
pad = float("$PAD_SECONDS")
audio_dur = float("$AUDIO_DUR")

work = Path("$WORK_DIR")
full_video = Path("$FULL_LOOP_VIDEO")
full_audio = Path("$INPUT_AUDIO")
captions_path = Path("$CAPTIONS_JSON")

data = json.loads(captions_path.read_text(encoding="utf-8"))
voice_segments = data.get("voiceSegments", [])

if not voice_segments:
    raise SystemExit("No voiceSegments found in captions.json. Run run_01_voice.sh first.")

meta_lines = []

for i, seg in enumerate(voice_segments, 1):
    index = f"{i:03d}"

    start = float(seg["start"])
    end = float(seg["end"])
    length = end - start

    if length <= 0:
        print(f"Skip invalid segment {index}: {start}-{end}")
        continue

    padded_start = max(0.0, start - pad)
    padded_end = min(audio_dur, end + pad)
    padded_length = padded_end - padded_start
    left_trim = start - padded_start

    next_start = audio_dur
    if i < len(voice_segments):
        next_start = float(voice_segments[i]["start"])

    gap_after = max(0.0, next_start - end)

    video_chunk = work / f"video_{index}.mp4"
    audio_chunk = work / f"audio_{index}.wav"

    print(
        f"Segment {index}: original={start:.3f}-{end:.3f} "
        f"len={length:.3f} padded={padded_start:.3f}-{padded_end:.3f} "
        f"left_trim={left_trim:.3f} gap_after={gap_after:.3f}"
    )

    meta_lines.append(
        f"{index},{start:.6f},{end:.6f},{length:.6f},{padded_start:.6f},{padded_length:.6f},{left_trim:.6f},{gap_after:.6f}\\n"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-ss", f"{padded_start:.6f}",
        "-t", f"{padded_length:.6f}",
        "-i", str(full_video),
        "-vf", f"fps={fps},setsar=1",
        "-c:v", "libx264",
        "-crf", "23",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-an",
        str(video_chunk)
    ], check=True)

    subprocess.run([
        "ffmpeg", "-y",
        "-ss", f"{padded_start:.6f}",
        "-t", f"{padded_length:.6f}",
        "-i", str(full_audio),
        "-ac", "1",
        "-ar", "16000",
        str(audio_chunk)
    ], check=True)

(work / "segments_meta.csv").write_text("".join(meta_lines), encoding="utf-8")
print(f"Created {len(meta_lines)} padded segment chunks.")
PY

echo "Running LatentSync segment by segment..."

exec 3< "$WORK_DIR/segments_meta.csv"

while IFS=',' read -r index start end length padded_start padded_length left_trim gap_after <&3; do
  video_chunk="$WORK_DIR/video_${index}.mp4"
  audio_chunk="$WORK_DIR/audio_${index}.wav"
  out_chunk="$WORK_DIR/out_${index}.mp4"
  core_chunk="$WORK_DIR/core_${index}.mp4"
  gap_chunk="$WORK_DIR/gap_${index}.mp4"

  echo "===================================="
  echo "Processing segment $index"
  echo "Original start=$start end=$end length=$length gap_after=$gap_after"
  echo "Padded length=$padded_length left_trim=$left_trim"
  echo "===================================="

  python -m scripts.inference \
    --unet_config_path "configs/unet/stage2_512.yaml" \
    --inference_ckpt_path "checkpoints/latentsync_unet.pt" \
    --inference_steps 15 \
    --guidance_scale 1.5 \
    --enable_deepcache \
    --video_path "$video_chunk" \
    --audio_path "$audio_chunk" \
    --video_out_path "$out_chunk" \
    < /dev/null

  echo "Cropping padding and normalizing segment $index to exact duration $length..."

  ffmpeg -y -nostdin \
    -ss "$left_trim" \
    -i "$out_chunk" \
    -t "$length" \
    -vf "fps=${FPS},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,tpad=stop_mode=clone:stop_duration=1,trim=duration=${length},setpts=PTS-STARTPTS" \
    -an \
    -c:v libx264 -crf 23 -preset veryfast \
    -pix_fmt yuv420p \
    "$core_chunk"

  python3 <<PY
from pathlib import Path
gap = float("$gap_after")
core = Path("$core_chunk")
gap_file = Path("$gap_chunk")

if gap > 0.001:
    import subprocess
    print(f"Creating frozen gap after segment $index: {gap:.6f}s")
    subprocess.run([
        "ffmpeg", "-y", "-nostdin",
        "-sseof", "-0.04",
        "-i", str(core),
        "-t", f"{gap:.6f}",
        "-vf", "fps=${FPS},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1",
        "-an",
        "-c:v", "libx264",
        "-crf", "23",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        str(gap_file)
    ], check=True)
else:
    gap_file.write_text("")
PY

done

exec 3<&-

echo "Concatenating core segments and pause gaps..."

CONCAT_FILE="$WORK_DIR/concat_timeline.txt"
rm -f "$CONCAT_FILE"

python3 <<PY
from pathlib import Path

work = Path("$WORK_DIR")
meta = (work / "segments_meta.csv").read_text(encoding="utf-8").splitlines()
concat = work / "concat_timeline.txt"

lines = []

for row in meta:
    if not row.strip():
        continue

    cols = row.split(",")
    index = cols[0]
    gap_after = float(cols[7])

    core = work / f"core_{index}.mp4"
    gap = work / f"gap_{index}.mp4"

    if core.exists():
        lines.append(f"file '{core.resolve()}'\\n")

    if gap_after > 0.001 and gap.exists() and gap.stat().st_size > 0:
        lines.append(f"file '{gap.resolve()}'\\n")

concat.write_text("".join(lines), encoding="utf-8")
print(f"Concat items: {len(lines)}")
PY

ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" \
  -c:v libx264 -crf 23 -preset veryfast \
  -pix_fmt yuv420p \
  "$WORK_DIR/clean_video_video_only.mp4"

echo "Attaching full voice_for_latentsync audio..."

ffmpeg -y \
  -i "$WORK_DIR/clean_video_video_only.mp4" \
  -i "$INPUT_AUDIO" \
  -t "$AUDIO_DUR" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v libx264 -crf 23 -preset veryfast \
  -c:a aac -b:a 160k \
  -pix_fmt yuv420p \
  ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4

echo "Checking durations..."
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$INPUT_AUDIO"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4

echo "Step 2 SEGMENT-LOCKED FAST WITH GAPS completed."
echo "Output:"
echo "~/AI-Workspace/DigitalHumanOutput/clean_video.mp4"
