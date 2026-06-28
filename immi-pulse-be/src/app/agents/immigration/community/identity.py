"""Anonymous identity primitives — handle/colour generation + device tokens.

Pure, dependency-light helpers so handle generation can be unit-tested without
a database. The service layer wraps :func:`generate_handle` in a uniqueness
retry loop against ``anon_identities``.
"""

from __future__ import annotations

import secrets

# Friendly, neutral word lists — no real names, nothing identifying.
ADJECTIVES = (
    "Quiet", "Bold", "Kind", "Peppy", "Silent", "Brave", "Calm", "Gentle",
    "Steady", "Swift", "Mellow", "Hopeful", "Bright", "Eager", "Sunny",
    "Lucky", "Patient", "Warm", "Clever", "Humble",
)
NOUNS = (
    "Harbor", "Lagoon", "Hawk", "Falcon", "Wave", "Lotus", "River", "Pine",
    "Cedar", "Otter", "Wombat", "Koala", "Meadow", "Summit", "Fern", "Reef",
    "Willow", "Comet", "Harbour", "Orchard",
)
COLORS = (
    "#7A5AF8", "#C026D3", "#2563EB", "#0EA5E9", "#65A30D", "#DB2777",
    "#F59E0B", "#1B7B6F",
)


def generate_handle() -> str:
    """Return a handle like ``BoldLagoon7745`` (adjective + noun + 4 digits)."""
    adj = secrets.choice(ADJECTIVES)
    noun = secrets.choice(NOUNS)
    num = 1000 + secrets.randbelow(9000)
    return f"{adj}{noun}{num}"


def generate_color() -> str:
    return secrets.choice(COLORS)


def generate_device_token() -> str:
    """Opaque, unguessable per-device token (persisted client-side)."""
    return secrets.token_hex(24)


def initials_of(handle: str) -> str:
    """Two-letter avatar initials from a CamelCase handle."""
    caps = [c for c in handle if c.isupper()]
    if len(caps) >= 2:
        return (caps[0] + caps[1]).upper()
    return handle[:2].upper()
