#!/usr/bin/env python3
"""Generate OG card + X banner via xAI Images API; fall back to reframing existing art."""
from __future__ import annotations

import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path("/workspace")
GROK = ROOT / ".grok"
API = "https://api.x.ai/v1"
KEY = os.environ.get("XAI_API_KEY") or ""
MODELS = [
    "grok-imagine-image-2.0",
    "grok-imagine-image-quality",
    "grok-imagine-image",
]

OG_PROMPT = (
    "A painterly storybook video-game cover of two young heroines standing side by "
    "side in a dim mossy stone dungeon corridor. On the left, Osea, a girl with pale "
    "lavender-blue hair, cream tunic, terracotta sash, olive boots, teal water magic "
    "swirling around her hands. On the right, Lois, a girl with chestnut auburn hair, "
    "olive-green tunic, terracotta belt, teal boots, terracotta fire glowing in her "
    "palms. Behind them a rusted iron gate, hanging lanterns, teal portal light on the "
    "left wall and warm firelight on the right. Centered in the very middle of the wide "
    "frame, a bold cream-and-gold painted title lockup that reads \"Osea\" on the first "
    "line and \"& Lois\" on the second line, with a smaller cream tagline \"Fire & Water\" "
    "underneath. The title sits dead-center with generous empty margins on every side, "
    "the lettering spanning about two-thirds of the width, never touching the edges. "
    "Warm charcoal shadows, olive moss, cream stone, terracotta fire, teal water. "
    "Intimate heroic cinematic game cover illustration."
)

EDIT_OG_PROMPT = (
    "Extend this dungeon portrait into a wide cinematic game cover. Keep both heroines "
    "exactly as they appear: Osea on the left with pale lavender-blue hair and teal water "
    "magic, Lois on the right with chestnut auburn hair and terracotta fire. Widen the "
    "mossy stone corridor, hanging lanterns, and rusted iron gate behind them. Centered "
    "in the very middle of the picture, paint a bold cream-and-gold title lockup that "
    "reads \"Osea\" on the first line and \"& Lois\" on the second line, with a smaller "
    "cream tagline \"Fire & Water\" underneath. The lettering sits in the center with "
    "generous empty margins on every side, spanning about two-thirds of the width, never "
    "touching the edges. Warm charcoal, olive moss, cream stone, terracotta firelight, "
    "teal water glow. Painterly intimate heroic game-cover illustration."
)

BANNER_PROMPT = (
    "Ultra-wide cinematic X feed banner of the same two dungeon heroines. Title lockup "
    "in the left half, sitting above the midline, with an empty strip along the bottom "
    "edge: cream-and-gold painted lettering that reads \"Osea & Lois\" on one line, "
    "smaller tagline \"Fire & Water\" just beneath it. Comfortable left and top margins; "
    "lettering never hugs the edge. Osea with teal water magic and Lois with terracotta "
    "fire stand in the scene; scenery and characters may extend into the right side of "
    "the frame. Dim mossy stone dungeon, hanging lanterns, rusted iron gate. Warm charcoal, "
    "olive, cream, terracotta, teal. Painterly storybook game banner."
)

EDIT_BANNER_PROMPT = (
    "Reframe this game cover as an ultra-wide cinematic banner. Keep the same two heroines "
    "and dungeon. Place the title lockup in the left half, sitting above the midline, with "
    "an empty strip along the bottom edge. The cream-and-gold lettering reads \"Osea & Lois\" "
    "with a smaller tagline \"Fire & Water\" underneath. Generous left and top margins; "
    "lettering never hugs the edge. Scenery and characters may extend into the right side. "
    "Same painterly storybook style, warm charcoal, olive, cream, terracotta, teal."
)


def log(msg: str) -> None:
    print(msg, flush=True)


def to_jpeg_bytes(path: Path, max_side: int = 1280, quality: int = 88) -> bytes:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def data_uri_jpeg(path: Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(to_jpeg_bytes(path)).decode("ascii")


def api_post(path: str, payload: dict, timeout: int = 180) -> dict:
    if not KEY:
        raise RuntimeError("XAI_API_KEY missing")
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {path}: {err[:800]}") from e


def save_b64_or_url(result: dict, dest: Path) -> Path:
    data = (result or {}).get("data") or []
    if not data:
        raise RuntimeError(f"empty image data: keys={list(result.keys())}")
    item = data[0]
    dest.parent.mkdir(parents=True, exist_ok=True)
    if item.get("b64_json"):
        dest.write_bytes(base64.b64decode(item["b64_json"]))
        return dest
    url = item.get("url")
    if not url:
        raise RuntimeError(f"no b64 or url in item keys={list(item.keys())}")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())
    return dest


def try_generate(prompt: str, aspect: str, dest: Path) -> Path | None:
    last_err = None
    for model in MODELS:
        payload = {
            "model": model,
            "prompt": prompt,
            "aspect_ratio": aspect,
            "resolution": "2k",
            "response_format": "b64_json",
        }
        try:
            log(f"generations model={model} aspect={aspect}")
            result = api_post("/images/generations", payload)
            return save_b64_or_url(result, dest)
        except Exception as e:
            last_err = e
            log(f"  fail: {e}")
    if last_err:
        log(f"generations exhausted: {last_err}")
    return None


def try_edit(prompt: str, aspect: str, refs: list[Path], dest: Path) -> Path | None:
    images = [{"type": "image_url", "url": data_uri_jpeg(p)} for p in refs]
    last_err = None
    for model in MODELS:
        # Try `images` array, then single `image`
        variants = [
            {
                "model": model,
                "prompt": prompt,
                "images": images,
                "aspect_ratio": aspect,
                "resolution": "2k",
                "response_format": "b64_json",
            },
            {
                "model": model,
                "prompt": prompt,
                "image": images[0],
                "aspect_ratio": aspect,
                "resolution": "2k",
                "response_format": "b64_json",
            },
        ]
        for i, payload in enumerate(variants):
            try:
                log(f"edits model={model} aspect={aspect} variant={i} refs={len(refs)}")
                result = api_post("/images/edits", payload)
                return save_b64_or_url(result, dest)
            except Exception as e:
                last_err = e
                log(f"  fail: {e}")
    if last_err:
        log(f"edits exhausted: {last_err}")
    return None


def extend_canvas(src: Path, dest: Path, target_ratio: float) -> Path:
    """Letterbox-extend an image to target_ratio using blurred side fill."""
    im = Image.open(src).convert("RGB")
    w, h = im.size
    cur = w / h
    if abs(cur - target_ratio) < 0.02:
        im.save(dest, format="JPEG", quality=92)
        return dest
    if cur < target_ratio:
        new_w = int(round(h * target_ratio))
        new_h = h
        canvas = Image.new("RGB", (new_w, new_h))
        # fill from stretched+blurred source
        fill = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        fill = fill.filter(ImageFilter.GaussianBlur(28))
        fill = ImageEnhance.Brightness(fill).enhance(0.55)
        fill = ImageEnhance.Color(fill).enhance(0.85)
        canvas.paste(fill, (0, 0))
        canvas.paste(im, ((new_w - w) // 2, 0))
    else:
        new_w = w
        new_h = int(round(w / target_ratio))
        canvas = Image.new("RGB", (new_w, new_h))
        fill = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        fill = fill.filter(ImageFilter.GaussianBlur(28))
        fill = ImageEnhance.Brightness(fill).enhance(0.55)
        canvas.paste(fill, (0, 0))
        canvas.paste(im, (0, (new_h - h) // 2))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, format="JPEG", quality=92)
    return dest


def main() -> int:
    cover = GROK / "ref-cover.png"
    cinematic = GROK / "ref-cinematic.png"
    og_raw = GROK / "og-raw.jpg"
    banner_raw = GROK / "x-banner-raw.jpg"

    log(f"key={'yes' if KEY else 'NO'} cover={cover.exists()}")

    og = try_edit(EDIT_OG_PROMPT, "2:1", [cover], og_raw)
    if og is None:
        og = try_generate(OG_PROMPT, "2:1", og_raw)
    if og is None:
        log("API failed for OG — extending existing cover to 2:1 (titleless fallback)")
        og = extend_canvas(cover, og_raw, 2.0)

    log(f"OG raw: {og} size={og.stat().st_size}")
    im = Image.open(og)
    log(f"OG dims: {im.size}")

    banner = None
    # Prefer 50:11 if the API accepts it, else 5:2
    for aspect in ("50:11", "5:2"):
        banner = try_edit(EDIT_BANNER_PROMPT, aspect, [og, cover], banner_raw)
        if banner is not None:
            break
        banner = try_generate(BANNER_PROMPT, aspect, banner_raw)
        if banner is not None:
            break
    if banner is None:
        log("API failed for banner — extending cover to 5:2 (titleless fallback)")
        banner = extend_canvas(cover, banner_raw, 2.5)

    log(f"banner raw: {banner} size={banner.stat().st_size}")
    im = Image.open(banner)
    log(f"banner dims: {im.size}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
