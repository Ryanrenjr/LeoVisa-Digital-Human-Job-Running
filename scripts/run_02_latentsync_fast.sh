#!/bin/bash
set -e

echo "===================================="
echo "Step 2 FAST: Generate digital human video with LatentSync"
echo "Mode: 720x1280 / 25fps / 15 steps"
echo "===================================="

cd ~/AI-Workspace/projects/LatentSync

source ~/miniconda3/etc/profile.d/conda.sh
conda activate latentsync

mkdir -p data/input

INPUT_VIDEO="data/input/boss_for_current_audio_fast.mp4"
RAW_BOSS_VIDEO="data/input/boss_default.mp4"
INPUT_AUDIO="data/input/voice_for_latentsync.wav"
OUTPUT_VIDEO="clean_video_fast.mp4"
TRIMMED_VIDEO="clean_video_fast_trimmed.mp4"

echo "Cleaning old LatentSync fast outputs..."
rm -f "$OUTPUT_VIDEO"
rm -f "$TRIMMED_VIDEO"
rm -f ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4
rm -f data/input/boss_for_current_audio_fast.mp4

echo "Preparing input audio and boss video..."
cp ~/AI-Workspace/DigitalHumanOutput/voice_for_latentsync.wav "$INPUT_AUDIO"
cp ~/AI-Workspace/VideoRefs/boss/default/boss_default.mp4 "$RAW_BOSS_VIDEO"

AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$INPUT_AUDIO")
echo "Audio duration: $AUDIO_DUR seconds"

echo "Creating FAST boss video matching audio duration..."
ffmpeg -y -stream_loop -1 -i "$RAW_BOSS_VIDEO" \
  -t "$AUDIO_DUR" \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=25" \
  -c:v libx264 -crf 23 -preset veryfast \
  -pix_fmt yuv420p \
  -an \
  "$INPUT_VIDEO"

echo "Running LatentSync FAST..."
python -m scripts.inference \
  --unet_config_path "configs/unet/stage2_512.yaml" \
  --inference_ckpt_path "checkpoints/latentsync_unet.pt" \
  --inference_steps 15 \
  --guidance_scale 1.5 \
  --enable_deepcache \
  --video_path "$INPUT_VIDEO" \
  --audio_path "$INPUT_AUDIO" \
  --video_out_path "$OUTPUT_VIDEO"

echo "Trimming final clean video to audio duration..."
ffmpeg -y -i "$OUTPUT_VIDEO" \
  -t "$AUDIO_DUR" \
  -c:v libx264 -crf 23 -preset veryfast \
  -c:a aac -b:a 160k \
  -pix_fmt yuv420p \
  "$TRIMMED_VIDEO"

cp "$TRIMMED_VIDEO" ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4

echo "Step 2 FAST completed."
echo "Output:"
echo "~/AI-Workspace/DigitalHumanOutput/clean_video.mp4"
