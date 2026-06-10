#!/bin/bash
set -e

echo "===================================="
echo "Step 2 CHUNKED FAST SYNC-SAFE"
echo "Generate digital human video with fixed-duration chunks"
echo "===================================="

cd ~/AI-Workspace/projects/LatentSync

source ~/miniconda3/etc/profile.d/conda.sh
conda activate latentsync

CHUNK_SECONDS=6
FPS=25

WORK_DIR="data/chunked_work"
INPUT_AUDIO="data/input/voice_for_latentsync.wav"
RAW_BOSS_VIDEO="data/input/boss_default.mp4"
FULL_LOOP_VIDEO="$WORK_DIR/boss_full_loop_fast.mp4"

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
echo "Audio duration: $AUDIO_DUR seconds"

echo "Creating full loop boss video..."
ffmpeg -y -stream_loop -1 -i "$RAW_BOSS_VIDEO" \
  -t "$AUDIO_DUR" \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=${FPS},setsar=1" \
  -c:v libx264 -crf 23 -preset veryfast \
  -pix_fmt yuv420p \
  -an \
  "$FULL_LOOP_VIDEO"

echo "Creating exact chunk metadata and source chunks..."

python3 <<PY
import math
import subprocess
from pathlib import Path

duration = float("$AUDIO_DUR")
chunk_seconds = int("$CHUNK_SECONDS")
fps = int("$FPS")

work = Path("$WORK_DIR")
full_video = Path("$FULL_LOOP_VIDEO")
audio = Path("$INPUT_AUDIO")

chunks = math.ceil(duration / chunk_seconds)
print(f"Total chunks: {chunks}")

meta_lines = []

for i in range(chunks):
    start = i * chunk_seconds
    length = min(chunk_seconds, duration - start)

    video_chunk = work / f"video_{i:03d}.mp4"
    audio_chunk = work / f"audio_{i:03d}.wav"
    meta_lines.append(f"{i},{start:.6f},{length:.6f}\\n")

    print(f"Creating chunk {i+1}/{chunks}: start={start:.3f}, length={length:.3f}")

    subprocess.run([
        "ffmpeg", "-y",
        "-ss", f"{start:.6f}",
        "-t", f"{length:.6f}",
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
        "-ss", f"{start:.6f}",
        "-t", f"{length:.6f}",
        "-i", str(audio),
        "-ac", "1",
        "-ar", "16000",
        str(audio_chunk)
    ], check=True)

(work / "chunks_meta.csv").write_text("".join(meta_lines), encoding="utf-8")
PY

echo "Running LatentSync chunk by chunk..."

while IFS=',' read -r index start length; do
  video_chunk="$WORK_DIR/video_${index}.mp4"
  audio_chunk="$WORK_DIR/audio_${index}.wav"
  out_chunk="$WORK_DIR/out_${index}.mp4"
  norm_chunk="$WORK_DIR/norm_${index}.mp4"

  echo "Processing chunk $index | start=$start | length=$length"

  python -m scripts.inference \
    --unet_config_path "configs/unet/stage2_512.yaml" \
    --inference_ckpt_path "checkpoints/latentsync_unet.pt" \
    --inference_steps 15 \
    --guidance_scale 1.5 \
    --enable_deepcache \
    --video_path "$video_chunk" \
    --audio_path "$audio_chunk" \
    --video_out_path "$out_chunk"

  echo "Normalizing chunk $index to exact duration $length..."

  ffmpeg -y \
    -i "$out_chunk" \
    -vf "fps=${FPS},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,tpad=stop_mode=clone:stop_duration=1,trim=duration=${length},setpts=PTS-STARTPTS" \
    -an \
    -c:v libx264 -crf 23 -preset veryfast \
    -pix_fmt yuv420p \
    "$norm_chunk"

done < "$WORK_DIR/chunks_meta.csv"

echo "Concatenating normalized chunks..."

CONCAT_FILE="$WORK_DIR/concat_norm.txt"
rm -f "$CONCAT_FILE"

for f in "$WORK_DIR"/norm_*.mp4; do
  echo "file '$(realpath "$f")'" >> "$CONCAT_FILE"
done

ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" \
  -c:v libx264 -crf 23 -preset veryfast \
  -pix_fmt yuv420p \
  "$WORK_DIR/clean_video_video_only.mp4"

echo "Attaching full original LatentSync audio and trimming to exact audio duration..."

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

echo "Step 2 CHUNKED FAST SYNC-SAFE completed."
echo "Output:"
echo "~/AI-Workspace/DigitalHumanOutput/clean_video.mp4"
