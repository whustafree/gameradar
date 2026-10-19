#!/usr/bin/env python
"""
Genera la identidad visual de GameRadar (v3): iconos, adaptive icons de
Android, favicon, apple-touch-icon y gráficos sociales.

Uso:
    python scripts/brand-icons.py

Dibuja a 4x y reduce con LANCZOS para que los bordes queden limpios en
tamaños pequeños. No depende de SVGs ni de servicios externos.
"""

import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --- Paleta de marca ---------------------------------------------------------
INK = (8, 8, 12, 255)          # fondo base
SURFACE = (16, 16, 23, 255)    # superficie
VIOLET = (139, 92, 255, 255)   # acento primario
LIME = (200, 255, 77, 255)     # señal / acento secundario
WHITE = (242, 243, 247, 255)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPERSAMPLE = 4


def _glyph(size, background, padding_ratio=0.0, ring_alpha=(235, 190, 145)):
    """Dibuja el glifo de radar centrado en un lienzo cuadrado."""
    s = size * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if background is not None:
        d.rectangle([0, 0, s, s], fill=background)

    cx = cy = s / 2
    R = (s / 2) - (s * padding_ratio)

    # Anillos concéntricos del radar
    for i, ratio in enumerate((0.86, 0.60, 0.34)):
        r = R * ratio
        width = max(1, int(s * 0.018))
        alpha = ring_alpha[i] if i < len(ring_alpha) else 140
        color = (VIOLET[0], VIOLET[1], VIOLET[2], alpha)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)

    # Haz del radar: cuña rellena + borde brillante
    a_start = math.radians(-56)
    a_end = math.radians(-26)
    steps = 10
    wedge = [(cx, cy)]
    for i in range(steps + 1):
        a = a_start + (a_end - a_start) * i / steps
        wedge.append((cx + math.cos(a) * R * 0.90, cy + math.sin(a) * R * 0.90))
    d.polygon(wedge, fill=(LIME[0], LIME[1], LIME[2], 70))

    ex, ey = cx + math.cos(a_end) * R * 0.92, cy + math.sin(a_end) * R * 0.92
    d.line([cx, cy, ex, ey], fill=LIME, width=max(2, int(s * 0.017)))

    # Punto del barrido + núcleo
    tip = max(2, int(s * 0.032))
    d.ellipse([ex - tip, ey - tip, ex + tip, ey + tip], fill=LIME)
    core = max(2, int(s * 0.048))
    d.ellipse([cx - core, cy - core, cx + core, cy + core], fill=LIME)

    # Halo suave alrededor del barrido
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line([cx, cy, ex, ey], fill=(LIME[0], LIME[1], LIME[2], 90), width=max(4, int(s * 0.075)))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=s * 0.02))
    img = Image.alpha_composite(glow, img)

    return img


def rounded(img, radius_ratio=0.22):
    s = img.size[0]
    mask = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=255)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def circle(img):
    s = img.size[0]
    mask = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, s - 1, s - 1], fill=255)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def save(img, path, size):
    out = img.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, "PNG", optimize=True)
    print(f"  {os.path.relpath(path, ROOT)}  ({size}x{size}, {os.path.getsize(path) // 1024} KB)")


def _load_font(size, bold=True):
    """Carga una fuente del sistema con varios fallbacks."""
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
        if bold else
        ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _draw_wordmark(img, x, y, main_size, sub_size=None):
    """Escribe GAMERADAR con separación de letras y una bajada opcional."""
    d = ImageDraw.Draw(img)
    font = _load_font(main_size)
    tracking = int(main_size * 0.06)
    cx = x
    for i, ch in enumerate("GAMERADAR"):
        color = LIME if i >= 4 else WHITE  # "RADAR" en lima
        d.text((cx, y), ch, font=font, fill=color)
        cx += d.textlength(ch, font=font) + tracking

    if sub_size:
        sub = _load_font(sub_size)
        sd = ImageDraw.Draw(img)
        label = "RADAR DE OFERTAS DE JUEGOS"
        sx = x
        for ch in label:
            sd.text((sx, y + main_size * 1.05), ch, font=sub, fill=(150, 140, 190))
            sx += sd.textlength(ch, font=sub) + int(sub_size * 0.10)
    return cx


def main():
    print("Generando identidad GameRadar v3")

    # --- PWA / web ---
    base = _glyph(1024, INK, padding_ratio=0.10)
    masked = rounded(base, 0.22)

    save(masked, os.path.join(ROOT, "public", "icons", "icon-512.png"), 512)
    save(masked, os.path.join(ROOT, "public", "icons", "icon-192.png"), 192)
    save(masked, os.path.join(ROOT, "public", "icons", "icon-96.png"), 96)

    # Maskable: el glifo vive dentro del 80% central para no recortarse
    maskable = _glyph(1024, INK, padding_ratio=0.24)
    save(rounded(maskable, 0.5), os.path.join(ROOT, "public", "icons", "icon-maskable-512.png"), 512)

    save(rounded(base, 0.22), os.path.join(ROOT, "public", "apple-touch-icon.png"), 180)
    save(rounded(_glyph(256, INK, padding_ratio=0.06), 0.18), os.path.join(ROOT, "public", "favicon-32.png"), 32)
    save(rounded(_glyph(256, INK, padding_ratio=0.06), 0.18), os.path.join(ROOT, "public", "favicon-16.png"), 16)

    # --- Android ---
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        folder = os.path.join(ROOT, "android", "app", "src", "main", "res", f"mipmap-{density}")
        save(rounded(_glyph(1024, INK, padding_ratio=0.12), 0.22), os.path.join(folder, "ic_launcher.png"), size)
        save(circle(_glyph(1024, INK, padding_ratio=0.16)), os.path.join(folder, "ic_launcher_round.png"), size)

        # Adaptive foreground: 108dp, glifo al ~55% para respetar la zona segura
        fg_size = int(size * 108 / 48)
        save(_glyph(1024, None, padding_ratio=0.30), os.path.join(folder, "ic_launcher_foreground.png"), fg_size)

    # --- Gráficos sociales / tienda ---
    social = Image.new("RGB", (1200, 630), INK[:3])
    sd = ImageDraw.Draw(social)
    sd.ellipse([820, -120, 1400, 460], fill=(22, 18, 40))
    mark = _glyph(1024, None, padding_ratio=0.18).resize((320, 320), Image.LANCZOS)
    social.paste(mark, (110, 155), mark)
    _draw_wordmark(social, 480, 250, 92, 26)
    os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
    social.save(os.path.join(ROOT, "public", "social-preview.png"), "PNG", optimize=True)
    print("  public/social-preview.png  (1200x630)")

    # --- Splash de Android (fondo tinta + glifo centrado) ---
    splashes = {
        "drawable/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    }
    glyph = _glyph(1024, None, padding_ratio=0.10)
    for rel, (w, h) in splashes.items():
        canvas = Image.new("RGBA", (w, h), INK)
        side = int(min(w, h) * 0.28)
        mark = glyph.resize((side, side), Image.LANCZOS)
        canvas.alpha_composite(mark, ((w - side) // 2, (h - side) // 2))
        target = os.path.join(ROOT, "android", "app", "src", "main", "res", rel)
        canvas.convert("RGB").save(target, "PNG", optimize=True)
        print(f"  {rel}  ({w}x{h})")

    # --- Assets de Play Store ---
    store_icon = rounded(_glyph(1024, INK, padding_ratio=0.10), 0.22).resize((512, 512), Image.LANCZOS)
    store_icon.save(os.path.join(ROOT, "play-store-icon.png"), "PNG", optimize=True)
    print("  play-store-icon.png  (512x512)")

    feature = Image.new("RGB", (1024, 500), INK[:3])
    fd = ImageDraw.Draw(feature)
    fd.ellipse([700, -180, 1250, 370], fill=(24, 20, 44))
    fd.ellipse([860, 250, 1180, 570], fill=(30, 24, 56))
    mk = _glyph(1024, None, padding_ratio=0.16).resize((240, 240), Image.LANCZOS)
    feature.paste(mk, (70, 130), mk)
    _draw_wordmark(feature, 350, 185, 76, 22)
    feature.save(os.path.join(ROOT, "feature-graphic.png"), "PNG", optimize=True)
    print("  feature-graphic.png  (1024x500)")

    print("Listo.")


if __name__ == "__main__":
    sys.exit(main())
