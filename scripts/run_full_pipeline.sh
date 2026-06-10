#!/bin/bash
set -e

echo "===================================="
echo "LeoVisa Digital Human Pipeline"
echo "Default Mode: FAST"
echo "720x1280 / 25fps / 15 steps"
echo "===================================="

bash ~/AI-Workspace/scripts/run_01_voice.sh
bash ~/AI-Workspace/scripts/run_02_latentsync_fast.sh
bash ~/AI-Workspace/scripts/run_03_remotion.sh

echo ""
echo "===================================="
echo "Pipeline completed."
echo "Final output:"
echo "C:\\Users\\rjxxx\\Desktop\\DigitalHumanOutput\\final_video.mp4"
echo "===================================="
