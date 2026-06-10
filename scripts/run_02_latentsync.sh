#!/bin/bash
set -e

echo "===================================="
echo "Step 2: Generate clean digital human video with LatentSync"
echo "===================================="

cd ~/AI-Workspace/projects/LatentSync

source ~/miniconda3/etc/profile.d/conda.sh
conda activate latentsync

INPUT_VIDEO="data/input/boss_default.mp4"
INPUT_AUDIO="data/input/voice_for_latentsync.wav"
OUTPUT_VIDEO="clean_video.mp4"

echo "Preparing input audio..."
mkdir -p data/input

cp ~/AI-Workspace/DigitalHumanOutput/voice_for_latentsync.wav "$INPUT_AUDIO"

cp ~/AI-Workspace/VideoRefs/boss/default/boss_default.mp4 "$INPUT_VIDEO"

if [ ! -f "$INPUT_VIDEO" ]; then
  echo "ERROR: Boss template video not found:"
  echo "$INPUT_VIDEO"
  echo "Please set default boss video at ~/AI-Workspace/VideoRefs/boss/default/boss_default.mp4"
  exit 1
fi

echo "Running LatentSync..."
python -m scripts.inference \
  --unet_config_path "configs/unet/stage2_512.yaml" \
  --inference_ckpt_path "checkpoints/latentsync_unet.pt" \
  --inference_steps 20 \
  --guidance_scale 1.5 \
  --enable_deepcache \
  --video_path "$INPUT_VIDEO" \
  --audio_path "$INPUT_AUDIO" \
  --video_out_path "$OUTPUT_VIDEO"

echo "Copying clean video to DigitalHumanOutput..."
cp "$OUTPUT_VIDEO" ~/AI-Workspace/DigitalHumanOutput/clean_video.mp4

echo "Step 2 completed."
echo "Output:"
echo "~/AI-Workspace/DigitalHumanOutput/clean_video.mp4"
