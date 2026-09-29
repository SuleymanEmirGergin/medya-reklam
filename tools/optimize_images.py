#!/usr/bin/env python3
"""Optimize the site's raster images with Pillow.

Run from any working directory with:
    python tools/optimize_images.py

Outputs are deterministic for a fixed Pillow/codec build. Existing files are
only replaced when their encoded bytes differ, and dimension-based transforms
become no-ops after the first run.
"""

from __future__ import annotations

import io
import json
import math
import os
import tempfile
from pathlib import Path
import PIL
from PIL import Image, ImageOps, features


ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "img"
CSS_PATH = ROOT / "assets" / "styles.css"
MANIFEST_PATH = ROOT / "tools" / "image-dims.json"
LARGE_FILE_LIMIT = 150 * 1024
MAX_WIDTH = 1920
HERO_WIDTHS = (640, 1024)  # kaynak 1024px; büyütme yok


def css_px(css: str, selector: str, property_name: str) -> float:
    """Read a pixel-valued declaration from a simple CSS rule."""
    import re

    match = re.search(
        rf"{re.escape(selector)}\s*\{{([^}}]*)\}}", css, flags=re.DOTALL
    )
    if not match:
        raise RuntimeError(f"CSS selector not found: {selector}")
    declaration = re.search(
        rf"(?:^|;)\s*{re.escape(property_name)}\s*:\s*([\d.]+)px\s*(?:;|$)",
        match.group(1),
    )
    if not declaration:
        raise RuntimeError(f"CSS {property_name} in {selector} is not in px")
    return float(declaration.group(1))


def rounded(value: float) -> int:
    return max(1, int(math.floor(value + 0.5)))


def png_bytes(image: Image.Image) -> bytes:
    clean = image.copy()
    clean.info.clear()

    # Palette conversion is used only when it is exact (<=256 actual RGB
    # colors). Images with non-opaque alpha remain RGBA to preserve soft edges.
    has_alpha = "A" in clean.getbands() or "transparency" in clean.info
    if has_alpha:
        rgba = clean.convert("RGBA")
        alpha_range = rgba.getchannel("A").getextrema()
        if alpha_range == (255, 255):
            clean = rgba.convert("RGB")
        else:
            clean = rgba
    else:
        clean = clean.convert("RGB")

    if clean.mode == "RGB":
        colors = clean.getcolors(maxcolors=257)
        if colors is not None and len(colors) <= 256:
            clean = clean.quantize(
                colors=max(1, len(colors)), method=Image.Quantize.FASTOCTREE
            )

    output = io.BytesIO()
    clean.save(output, format="PNG", optimize=True)
    return output.getvalue()


def webp_bytes(image: Image.Image, quality: int) -> bytes:
    clean = image.copy()
    clean.info.clear()
    output = io.BytesIO()
    clean.save(
        output,
        format="WEBP",
        quality=quality,
        method=6,
        exact=True,
        alpha_quality=100,
    )
    return output.getvalue()


def atomic_write_if_changed(path: Path, data: bytes) -> bool:
    """Write atomically, leaving an already-identical file untouched."""
    if path.exists() and path.read_bytes() == data:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
        ) as temp_file:
            temp_name = temp_file.name
            temp_file.write(data)
        os.replace(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)
    return True


def open_oriented(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.load()
        oriented = ImageOps.exif_transpose(source)
        has_alpha = "A" in oriented.getbands() or "transparency" in oriented.info
        clean = oriented.convert("RGBA") if has_alpha else oriented.copy()
    clean.info.clear()
    return clean


def transform_logo(path: Path, target_size: tuple[int, int]) -> Image.Image:
    source = open_oriented(path)
    if source.size != target_size:
        source = source.resize(target_size, Image.Resampling.LANCZOS)
    return source


def file_bytes(path: Path) -> int:
    return path.stat().st_size if path.exists() else 0


def total_image_bytes() -> int:
    return sum(path.stat().st_size for path in IMG_DIR.rglob("*") if path.is_file())


def optimize_logos(css: str, sizes_before: dict[Path, int]) -> list[Path]:
    # ponytail: styles.css'teki gösterim ölçüleri (--header-h, .site-footer .brand__logo, .preloader__logo); CSS değişirse güncelle
    header_height, footer_width, preloader_width = 76, 330, 168

    specifications: tuple[tuple[str, str, str, float], ...] = (
        ("logo.png", "height", "header", header_height),
        # footer/preloader kaynakları zaten retina hedefinden küçük; büyütmek dosyayı şişiriyor
    )
    written: list[Path] = []

    for filename, dimension, label, display_value in specifications:
        path = IMG_DIR / filename
        source = open_oriented(path)
        source_width, source_height = source.size
        if dimension == "height":
            target_height = rounded(display_value * 2)
            target_size = (rounded(target_height * source_width / source_height), target_height)
        else:
            target_width = rounded(display_value * 2)
            target_size = (target_width, rounded(target_width * source_height / source_width))

        optimized = transform_logo(path, target_size)
        png_data = png_bytes(optimized)
        if atomic_write_if_changed(path, png_data):
            written.append(path)

        sibling = path.with_suffix(".webp")
        webp_data = webp_bytes(optimized, quality=90)
        if atomic_write_if_changed(sibling, webp_data):
            written.append(sibling)

        print(
            f"LOGO {filename}: {label} display={display_value:g}px; "
            f"retina={target_size[0]}x{target_size[1]}px; "
            f"PNG {sizes_before.get(path, 0)}->{file_bytes(path)} bytes; "
            f"WebP {file_bytes(sibling)} bytes"
        )
    return written


def avif_supported() -> bool:
    try:
        return bool(features.check("avif"))
    except Exception:
        return False


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = rounded(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def optimize_hero(sizes_before: dict[Path, int], avif: bool) -> list[Path]:
    source_path = IMG_DIR / "cephe-mahir.jpg"
    source = open_oriented(source_path)
    written: list[Path] = []

    for width in HERO_WIDTHS:
        variant = resize_to_width(source, width)
        webp_path = IMG_DIR / f"cephe-mahir-{width}.webp"
        webp_data = webp_bytes(variant, quality=78)
        if atomic_write_if_changed(webp_path, webp_data):
            written.append(webp_path)

        if avif:
            avif_path = IMG_DIR / f"cephe-mahir-{width}.avif"
            clean = variant.copy()
            clean.info.clear()
            output = io.BytesIO()
            clean.save(output, format="AVIF", quality=55, speed=6)
            if atomic_write_if_changed(avif_path, output.getvalue()):
                written.append(avif_path)

        print(
            f"HERO {width}px: WebP {file_bytes(webp_path)} bytes"
            + (f"; AVIF {file_bytes(IMG_DIR / f'cephe-mahir-{width}.avif')} bytes" if avif else "")
        )
    return written


def optimize_oversized(sizes_before: dict[Path, int]) -> list[Path]:
    candidates = sorted(
        path
        for path in IMG_DIR.rglob("*")
        if path.is_file()
        and path.suffix.lower() in {".jpg", ".webp"}
        and path.stat().st_size > LARGE_FILE_LIMIT
    )
    print("150 KB üzeri JPG/WebP dosyaları (işlem öncesi envanter):")
    if not candidates:
        print("  Yok")
    for path in candidates:
        with Image.open(path) as image:
            oriented = ImageOps.exif_transpose(image)
            print(
                f"  {path.relative_to(ROOT).as_posix()} {path.stat().st_size} bytes "
                f"{oriented.width}x{oriented.height}px"
            )

    written: list[Path] = []
    for path in candidates:
        image = open_oriented(path)
        if image.width <= MAX_WIDTH:
            continue
        resized = resize_to_width(image, MAX_WIDTH)
        output = io.BytesIO()
        if path.suffix.lower() == ".jpg":
            if resized.mode not in {"RGB", "L"}:
                resized = resized.convert("RGB")
            resized.save(output, format="JPEG", quality=82, progressive=True, optimize=True)
        else:
            resized.save(
                output,
                format="WEBP",
                quality=80,
                method=6,
                exact=True,
                alpha_quality=100,
            )
        if atomic_write_if_changed(path, output.getvalue()):
            written.append(path)
            print(
                f"RESIZED {path.relative_to(ROOT).as_posix()}: "
                f"{sizes_before.get(path, 0)}->{file_bytes(path)} bytes"
            )
    return written


def write_manifest() -> bool:
    dimensions: dict[str, list[int]] = {}
    for path in sorted(p for p in IMG_DIR.rglob("*") if p.is_file()):
        with Image.open(path) as image:
            image.load()
            oriented = ImageOps.exif_transpose(image)
            dimensions[path.relative_to(ROOT).as_posix()] = [oriented.width, oriented.height]

    data = (json.dumps(dimensions, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    changed = atomic_write_if_changed(MANIFEST_PATH, data)
    print(f"Manifest {MANIFEST_PATH.relative_to(ROOT).as_posix()}: {len(dimensions)} görsel")
    return changed


def main() -> int:
    if not IMG_DIR.is_dir():
        raise SystemExit(f"Görsel dizini bulunamadı: {IMG_DIR}")

    sizes_before = {path: path.stat().st_size for path in IMG_DIR.rglob("*") if path.is_file()}
    total_before = total_image_bytes()
    css = CSS_PATH.read_text(encoding="utf-8")
    avif = avif_supported()
    print(f"Pillow {PIL.__version__}; AVIF desteği: {'var' if avif else 'yok'}")
    print(f"assets/img toplamı önce: {total_before} bytes")

    changed: list[Path] = []
    changed.extend(optimize_logos(css, sizes_before))
    changed.extend(optimize_hero(sizes_before, avif))
    changed.extend(optimize_oversized(sizes_before))
    manifest_changed = write_manifest()

    total_after = total_image_bytes()
    print(f"assets/img toplamı sonra: {total_after} bytes")
    print(f"Değişen görsel dosyası: {len(set(changed))}; manifest: {'değişti' if manifest_changed else 'aynı'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
