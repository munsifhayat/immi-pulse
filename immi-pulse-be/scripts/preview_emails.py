"""Render every email template to local HTML files and open them.

The .html files in src/app/integrations/resend/templates/ are Jinja2 templates —
opening them directly shows raw `{% %}` syntax, not the email itself. This script
renders them with realistic sample data and writes them to ./tmp/email_previews/,
then opens them in the default browser.

Usage:
    PYTHONPATH=src python scripts/preview_emails.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# Allow running as `python scripts/preview_emails.py` from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from app.integrations.resend.templates import render  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent.parent / "tmp" / "email_previews"

SAMPLES = {
    "welcome.html": dict(
        recipient_name="Sarah Lee",
        dashboard_url="https://app.immi-pulse.com/dashboard",
        support_email="support@immi-pulse.com",
    ),
    "upload_link.html": dict(
        recipient_name="Aanya Sharma",
        consultant_name="Priya Naidu",
        firm_name="Sapphire Migration",
        upload_url="https://portal.immi-pulse.com/u/secure/abc123def456ghi789",
        pin="482719",
        expires_at_label="Sat, May 16 at 6:00 PM AEST",
        support_email="support@immi-pulse.com",
    ),
    "generic.html": dict(
        eyebrow_text="Case update",
        headline="Aanya’s checklist is ready for your review.",
        recipient_name="Munsif Hayat",
        body_html=(
            "<p>The AI just finished drafting the document checklist and evidence plan "
            "for Aanya Sharma’s Subclass 482 (Skills in Demand) application. Three "
            "items need your judgment before we send it to her:</p>"
            "<ul style=\"padding-left: 20px; margin: 18px 0; color: #475367;\">"
            "<li style=\"margin-bottom: 8px;\">Sponsor nomination &mdash; the system flagged "
            "a possible TSMIT mismatch worth a second look.</li>"
            "<li style=\"margin-bottom: 8px;\">English evidence &mdash; PTE score from 2022 "
            "may need a refresh under the new rules.</li>"
            "<li>Health checks &mdash; HAP ID not yet generated; book once you confirm panel clinic.</li>"
            "</ul>"
            "<p>Everything else looks clean. Estimated lodgement readiness: "
            "<strong style=\"color:#101928;\">9 days</strong> if the above resolve quickly.</p>"
        ),
        cta_label="Review the checklist",
        cta_url="https://app.immi-pulse.com/cases/aanya-sharma",
        signoff=(
            "Caught a heuristic that needs tuning? Reply and we’ll patch it &mdash; "
            "the model learns from corrections at your firm specifically."
        ),
        support_email="support@immi-pulse.com",
    ),
}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for template_name, ctx in SAMPLES.items():
        html = render(template_name, **ctx)
        out_path = OUT_DIR / template_name
        out_path.write_text(html, encoding="utf-8")
        written.append(out_path)
        print(f"  rendered  {template_name}  ->  {out_path}")

    # Open the index in the browser. Build a simple chooser page too.
    index_html = _build_index(written)
    index_path = OUT_DIR / "index.html"
    index_path.write_text(index_html, encoding="utf-8")
    print(f"\n  index     {index_path}")

    if sys.platform == "darwin":
        subprocess.run(["open", str(index_path)], check=False)
    elif sys.platform.startswith("linux"):
        subprocess.run(["xdg-open", str(index_path)], check=False)
    elif sys.platform == "win32":
        subprocess.run(["start", str(index_path)], shell=True, check=False)


def _build_index(rendered: list[Path]) -> str:
    cards = "\n".join(
        f'<a href="{p.name}" style="display:block;padding:20px 24px;border:1px solid #EEF0F3;'
        f'border-radius:10px;text-decoration:none;color:#101928;font-family:system-ui,sans-serif;'
        f'margin-bottom:12px;">{p.stem.replace("_", " ").title()}'
        f'<span style="display:block;color:#7A5AF8;font-size:13px;margin-top:4px;">'
        f'open preview &rarr;</span></a>'
        for p in rendered
    )
    return f"""<!doctype html><html><head><meta charset='utf-8'>
<title>IMMI-PULSE email previews</title></head>
<body style='background:#F4F5F7;margin:0;padding:48px 24px;font-family:system-ui,sans-serif;'>
<div style='max-width:520px;margin:0 auto;'>
<h1 style='font-weight:600;color:#101928;letter-spacing:-0.5px;'>IMMI&#8209;PULSE email previews</h1>
<p style='color:#475367;margin-bottom:32px;'>Click any template to view the rendered email.</p>
{cards}
</div></body></html>"""


if __name__ == "__main__":
    main()
