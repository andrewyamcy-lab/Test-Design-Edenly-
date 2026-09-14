from pathlib import Path
import json
import html
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "flavours.json"
INDEX = ROOT / "index.html"
FAMILY = ROOT / "family.html"

PALETTE = [
    ("#e5cf91", "#fbf3d4"),
    ("#8eac69", "#d4e5b0"),
    ("#cbbbd3", "#eee5f0"),
    ("#67635f", "#c8c3bd"),
    ("#4f7138", "#9fbd72"),
    ("#9e603b", "#e2ad73"),
    ("#c7b18e", "#efe4cf"),
    ("#d98695", "#efc56f"),
]


def esc(value):
    return html.escape(str(value or ""), quote=True)


def load_flavours():
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    flavours = payload.get("flavours", [])
    seen = set()
    for f in flavours:
        fid = str(f.get("id", "")).strip()
        if not re.fullmatch(r"[a-z0-9_]+", fid):
            raise SystemExit(f"Invalid flavour id: {fid!r}")
        if fid in seen:
            raise SystemExit(f"Duplicate flavour id: {fid}")
        seen.add(fid)
        if f.get("status") not in {"available", "soldout", "hidden"}:
            raise SystemExit(f"Invalid status for {fid}")
    return flavours


def patch_index(flavours):
    b = INDEX.read_bytes()
    visible = [f for f in flavours if f.get("homepage", True) and f.get("status") != "hidden"]

    zh_names = " ✦ ".join(str(f.get("name_zh", "")) for f in visible)
    en_names = " ✦ ".join(str(f.get("name_en", "")) for f in visible)
    if zh_names:
        zh_names += " ✦"
    if en_names:
        en_names += " ✦"
    strip = (
        '<div class="strip"><div>'
        f'<span data-zh="{esc(zh_names)}" data-en="{esc(en_names)}">{esc(zh_names)}</span>'
        f'<span data-zh="{esc(zh_names)}" data-en="{esc(en_names)}">{esc(zh_names)}</span>'
        '</div></div>\n'
    ).encode("utf-8")

    start = b.find(b'<div class="strip">')
    end_marker = b'<div class="w"><section id="flavours">'
    end = b.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit("Could not locate homepage flavour strip")
    b = b[:start] + strip + b[end:]

    cards = []
    for i, f in enumerate(visible):
        c1, c2 = PALETTE[i % len(PALETTE)]
        sold = f.get("status") == "soldout"
        status = (
            '<span class="fl-status" data-zh="售罄" data-en="Sold Out">售罄</span>'
            if sold else ""
        )
        cls = "card fl soldout" if sold else "card fl"
        cards.append(
            f'<div class="{cls}">'
            f'<div class="orb" style="background:linear-gradient(140deg,{c1},{c2})"></div>'
            f'<small>{esc(f.get("category", "Classic"))}</small>'
            f'{status}'
            f'<h3 data-zh="{esc(f.get("name_zh"))}" data-en="{esc(f.get("name_en"))}">{esc(f.get("name_zh"))}</h3>'
            f'<p data-zh="{esc(f.get("description_zh"))}" data-en="{esc(f.get("description_en"))}">{esc(f.get("description_zh"))}</p>'
            '</div>'
        )

    count = len(visible)
    zh_title = f"{count} 款口味，總有一款啱你。"
    en_title = f"{count} flavours, something for everyone."
    zh_desc = f"以下為 Edenly 現時顯示的 {count} 款口味；每日供應情況以店內及 Instagram 最新公告為準。"
    en_desc = f"These are Edenly’s {count} currently listed flavours. Daily availability may vary — check the shop or Instagram for the latest selection."
    section = (
        '<section id="flavours"><div class="head"><div>'
        '<div class="k" data-zh="雪櫃口味" data-en="The counter">雪櫃口味</div>'
        f'<h2 data-zh="{esc(zh_title)}" data-en="{esc(en_title)}">{esc(zh_title)}</h2>'
        '</div>'
        f'<p data-zh="{esc(zh_desc)}" data-en="{esc(en_desc)}">{esc(zh_desc)}</p>'
        '</div><div class="grid">'
        + ''.join(cards)
        + '</div></section>'
    ).encode("utf-8")

    sec_start = b.find(b'<section id="flavours">')
    sec_end = b.find(b'</section>', sec_start)
    if sec_start < 0 or sec_end < 0:
        raise SystemExit("Could not locate homepage flavour section")
    sec_end += len(b'</section>')
    b = b[:sec_start] + section + b[sec_end:]

    if b'/* flavour-status */' not in b:
        css = b'''\n/* flavour-status */\n.fl{position:relative}.fl-status{display:inline-flex;align-self:flex-start;margin:7px 0 5px;padding:4px 8px;border-radius:999px;background:var(--p);color:#6b3329;font-size:11px;font-weight:900;letter-spacing:.02em}.fl.soldout{opacity:.62}\n'''
        pos = b.find(b'</style>')
        if pos < 0:
            raise SystemExit("Could not locate homepage </style>")
        b = b[:pos] + css + b[pos:]

    INDEX.write_bytes(b)


def patch_family(flavours):
    b = FAMILY.read_bytes()
    visible = [f for f in flavours if f.get("family", True) and f.get("status") != "hidden"]

    inputs = []
    for i, f in enumerate(visible, start=1):
        fid = str(f["id"])
        sold = f.get("status") == "soldout"
        sold_attr = ' data-soldout="1"' if sold else ''
        small = (
            '<small data-zh="售罄" data-en="Sold Out">售罄</small>'
            if sold else f'<small>{esc(f.get("name_en"))}</small>'
        )
        inputs.append(
            f'<input class="choice-input flavour-check" type="checkbox" id="f_{esc(fid)}" value="{esc(fid)}" disabled{sold_attr}>'
            f'<label class="flavour-choice" for="f_{esc(fid)}">'
            f'<strong data-zh="{esc(f.get("name_zh"))}" data-en="{esc(f.get("name_en"))}">{esc(f.get("name_zh"))}</strong>'
            f'{small}</label>'
        )
    grid = ('<div class="flavour-grid">\n' + '\n'.join(inputs) + '\n</div>').encode("utf-8")

    grid_start = b.find(b'<div class="flavour-grid">')
    if grid_start < 0:
        raise SystemExit("Could not locate family flavour grid")
    grid_end = b.find(b'</div>', grid_start)
    if grid_end < 0:
        raise SystemExit("Could not locate family flavour grid end")
    grid_end += len(b'</div>')
    b = b[:grid_start] + grid + b[grid_end:]

    names = {
        str(f["id"]): {"zh": str(f.get("name_zh", "")), "en": str(f.get("name_en", ""))}
        for f in visible
    }
    flavours_js = ('const flavours=' + json.dumps(names, ensure_ascii=False, separators=(",", ":")) + ';').encode("utf-8")
    b, n = re.subn(rb'const flavours=\{.*?\};', lambda m: flavours_js, b, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("Could not replace family flavours JS object")

    old = b"flavourChecks.forEach(c=>c.disabled=false)"
    new = b"flavourChecks.forEach(c=>c.disabled=c.dataset.soldout==='1')"
    if old in b:
        b = b.replace(old, new, 1)
    elif new not in b:
        raise SystemExit("Could not patch sold-out family logic")

    FAMILY.write_bytes(b)


def main():
    flavours = load_flavours()
    patch_index(flavours)
    patch_family(flavours)
    print(f"Synced {len(flavours)} flavour records")


if __name__ == "__main__":
    main()
