#!/bin/bash
set -e

echo "===================================="
echo "VoxCPM2 Prompt Variant Test"
echo "只测试声音，不跑口型，不跑字幕，不跑 Remotion"
echo "===================================="

ROOT="$HOME/AI-Workspace"
INPUT="$ROOT/DigitalHumanInput"
OUTPUT="$ROOT/DigitalHumanOutput"
VOX="$ROOT/projects/VoxCPM"
TEST_OUT="$OUTPUT/voice_prompt_tests_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$TEST_OUT"

echo "Test output:"
echo "$TEST_OUT"

echo ""
echo "Step 1: Backup current input and generator"
echo "===================================="

cp "$VOX/generate_voice_and_timeline_voxcpm2.py" "$TEST_OUT/generate_voice_and_timeline_voxcpm2.original.py"

mkdir -p "$TEST_OUT/input_backup"
cp "$INPUT/title.txt" "$TEST_OUT/input_backup/title.txt" 2>/dev/null || true
cp "$INPUT/subtitle.txt" "$TEST_OUT/input_backup/subtitle.txt" 2>/dev/null || true
cp "$INPUT/script.txt" "$TEST_OUT/input_backup/script.txt" 2>/dev/null || true
cp "$INPUT/keywords.txt" "$TEST_OUT/input_backup/keywords.txt" 2>/dev/null || true

echo ""
echo "Step 2: Write test input"
echo "===================================="

cat > "$INPUT/title.txt" <<'EOF'
Pharmacy First测试
EOF

cat > "$INPUT/subtitle.txt" <<'EOF'
声音克隆 Prompt 对比
EOF

cat > "$INPUT/keywords.txt" <<'EOF'
Pharmacy First
GP
Boots
NHS
药房优先
李尔王
EOF

cat > "$INPUT/script.txt" <<'EOF'
前几天我嗓子疼，疼得说话都费劲。我跟以前一样，第一反应就是，赶紧打电话约 GP，全科医生。结果我朋友在旁边听见了，白了我一眼说，你别约了，直接走去 Boots 就行，免费的。

我跟你说，我在英国生活了二十二年，这事儿我居然才知道。

其实从二零二四年开始，英格兰的 NHS 就有一个服务，叫 Pharmacy First，翻译过来就是药房优先。

意思是，有七种常见的小毛病，你不用先约 GP，直接去药房找药剂师就行。

药剂师可以给你看，该开药就开药，该开抗生素就开抗生素，全程不花钱，跟你去 GP 是一样的。

哪七种呢？我给你数一下，你最好记一下。

第一，嗓子疼，五岁以上都可以。

第二，耳朵疼，一到十七岁的孩子。

第三，鼻窦炎，十二岁以上。

第四，一种叫 impetigo 的皮肤感染，小孩特别容易得。

第五，带状疱疹，就是咱们老一辈说的缠腰龙，十八岁以上。

第六，被虫子咬了之后发炎。

第七，女性的轻度尿路感染，十六到六十四岁。

你看，这七样基本上覆盖了一个家庭一年里头疼脑热的大部分情况。

我自己的经验啊，之前孩子半夜耳朵疼，我们家也是干等到第二天早上八点抢 GP 电话。

其实那种情况，第二天一早去药房，可能十五分钟就解决了。

还有一个小细节我要提醒你，这个服务只在英格兰有。

苏格兰、威尔士、北爱尔兰有各自类似的服务，但规矩不一样，你得问当地药房。

怎么用呢？其实特别简单。

你直接走进药房，跟柜台说，我想做 Pharmacy First consultation，药房优先咨询。

他们会带你去后面一个小房间私下聊。

不用预约，不用挂号，不用 NHS 号码也行。

当然啦，如果是严重的、拖了很久的、或者孩子高烧不退，该约 GP 还是要约 GP，该去 A&E，急诊，还是要去 A&E，这个不能省。

在英国生活久了你会发现，最值钱的不是看了多少医生，是知道什么时候不用看医生。

今天分享给你，希望帮上忙。

我是李尔王，我们下期见。
EOF

patch_prompt() {
  local prompt="$1"

  cp "$TEST_OUT/generate_voice_and_timeline_voxcpm2.original.py" "$VOX/generate_voice_and_timeline_voxcpm2.py"

  python3 <<PY
from pathlib import Path
import re

p = Path("$VOX/generate_voice_and_timeline_voxcpm2.py")
s = p.read_text(encoding="utf-8")

new_prompt = """$prompt"""

# 替换当前 VoxCPM2 风格提示词。
# 匹配类似：(中年男性，中文法律评论口播，语速自然，略微偏慢，沉稳、有判断力)
pattern = r"\\(中年男性，中文法律评论口播，[^\\)]*?\\)"

if not re.search(pattern, s):
    print("WARNING: 没找到原来的风格 Prompt。")
    print("请手动检查：grep -n '中年男性\\|中文法律评论\\|语速' generate_voice_and_timeline_voxcpm2.py")
else:
    s = re.sub(pattern, new_prompt, s)

p.write_text(s, encoding="utf-8")
print("Patched prompt to:", repr(new_prompt))
PY
}

run_variant() {
  local name="$1"
  local prompt="$2"

  echo ""
  echo "===================================="
  echo "Running variant: $name"
  echo "Prompt: $prompt"
  echo "===================================="

  patch_prompt "$prompt"

  cd "$VOX"
  source "$HOME/miniconda3/etc/profile.d/conda.sh"
  conda activate voxcpm

  python generate_voice_and_timeline_voxcpm2.py

  mkdir -p "$TEST_OUT/$name"

  cp "$OUTPUT/voice.wav" "$TEST_OUT/$name/voice_${name}.wav"
  cp "$OUTPUT/voice_for_latentsync.wav" "$TEST_OUT/$name/voice_for_latentsync_${name}.wav"
  cp "$OUTPUT/captions.json" "$TEST_OUT/$name/captions_${name}.json"

  mkdir -p "$TEST_OUT/$name/audio_segments"
  cp "$OUTPUT/audio_segments/"*.wav "$TEST_OUT/$name/audio_segments/" 2>/dev/null || true

  echo "Saved variant $name to:"
  echo "$TEST_OUT/$name"
}

run_variant "A_no_prompt" ""
run_variant "B_weak_prompt" "(中文自然口播。)"
run_variant "C_slow_clear_prompt" "(中文自然口播，语速稍慢，停顿清楚。)"

echo ""
echo "Step 4: Restore original generator and input files"
echo "===================================="

cp "$TEST_OUT/generate_voice_and_timeline_voxcpm2.original.py" "$VOX/generate_voice_and_timeline_voxcpm2.py"

cp "$TEST_OUT/input_backup/title.txt" "$INPUT/title.txt" 2>/dev/null || true
cp "$TEST_OUT/input_backup/subtitle.txt" "$INPUT/subtitle.txt" 2>/dev/null || true
cp "$TEST_OUT/input_backup/script.txt" "$INPUT/script.txt" 2>/dev/null || true
cp "$TEST_OUT/input_backup/keywords.txt" "$INPUT/keywords.txt" 2>/dev/null || true

echo ""
echo "===================================="
echo "Done."
echo "请试听这三个文件："
echo "$TEST_OUT/A_no_prompt/voice_A_no_prompt.wav"
echo "$TEST_OUT/B_weak_prompt/voice_B_weak_prompt.wav"
echo "$TEST_OUT/C_slow_clear_prompt/voice_C_slow_clear_prompt.wav"
echo "===================================="
