import asyncio
import json
import logging
import re
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

OLLAMA_BASE   = "http://127.0.0.1:11434"
DEFAULT_MODEL = "qwen2.5:7b"

_SYSTEM = (
    "你是一个短视频文案整理助手。\n"
    "请不要改变事实，不要新增政策信息。\n"
    "请只做结构整理和字幕拆分。\n\n"
    "请把输入文案整理为以下 JSON 格式，只输出 JSON，不要有任何其他文字：\n"
    '{\n'
    '  "title": "视频标题，10字以内",\n'
    '  "subtitle": "副标题，20字以内",\n'
    '  "keywords": ["关键词1", "关键词2", "关键词3"],\n'
    '  "clean_script": "适合口播的干净版本，去掉多余停顿词，保持原文全部事实",\n'
    '  "subtitle_lines": ["每行10至15个中文字", "不把完整词语拆开"],\n'
    '  "opening_hook": "开头3秒钩子，15字以内"\n'
    "}\n\n"
    "字幕拆分规则：\n"
    "- 每行尽量 10-15 个中文字\n"
    "- 不要把完整词语、专有名词拆开\n"
    "- 不要把英文缩写拆开（ILR、UK、EU 等）\n"
    "- 标点可以删除或弱化\n"
    "- 保持原意，不加入原文没有的事实\n"
    "只输出 JSON，不要其他文字。"
)


def _call_ollama(model: str, raw_text: str) -> dict:
    payload = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user",   "content": f"输入文案：\n{raw_text}"},
            ],
            "stream": False,
            "format": "json",
        },
        ensure_ascii=False,
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 404 or "not found" in body.lower():
            raise ValueError("model_not_found")
        raise ValueError(f"ollama_http_{exc.code}: {body[:200]}")
    except urllib.error.URLError:
        raise ValueError("ollama_not_running")

    content = data.get("message", {}).get("content", "")
    if not content:
        raise ValueError("Empty response from Ollama")

    # Direct JSON parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Extract JSON block from surrounding text
    m = re.search(r"\{[\s\S]*\}", content)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Cannot parse Ollama response as JSON: {content[:300]}")


async def format_script(raw_text: str, model: str = DEFAULT_MODEL) -> dict:
    loop = asyncio.get_event_loop()
    raw  = await loop.run_in_executor(None, _call_ollama, model, raw_text)

    keywords = raw.get("keywords", [])
    if not isinstance(keywords, list):
        keywords = [str(keywords)]

    subtitle_lines = raw.get("subtitle_lines", [])
    if not isinstance(subtitle_lines, list):
        subtitle_lines = []

    return {
        "title":          str(raw.get("title",        "")),
        "subtitle":       str(raw.get("subtitle",     "")),
        "keywords":       [str(k) for k in keywords],
        "clean_script":   str(raw.get("clean_script", "")),
        "subtitle_lines": [str(s) for s in subtitle_lines],
        "opening_hook":   str(raw.get("opening_hook", "")),
    }
