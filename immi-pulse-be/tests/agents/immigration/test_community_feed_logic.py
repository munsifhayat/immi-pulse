"""Unit tests for community feed v2 pure logic (derived span + identity)."""

from __future__ import annotations

from datetime import date

from app.agents.immigration.community import identity, processing


# --- derive_span ------------------------------------------------------------


def test_derive_span_granted_uses_visa_granted_milestone():
    ms = [
        ("Visa Lodged", date(2024, 12, 2)),
        ("Medical Examination", date(2025, 1, 10)),
        ("Visa Granted", date(2025, 6, 2)),
    ]
    lodged, decided, days = processing.derive_span(ms, "granted")
    assert lodged == date(2024, 12, 2)
    assert decided == date(2025, 6, 2)
    assert days == 182


def test_derive_span_granted_without_explicit_grant_falls_back_to_last():
    ms = [
        ("Visa Lodged", date(2024, 12, 2)),
        ("Medical Examination", date(2025, 1, 10)),
    ]
    lodged, decided, days = processing.derive_span(ms, "granted")
    assert lodged == date(2024, 12, 2)
    assert decided == date(2025, 1, 10)
    assert days == 39


def test_derive_span_waiting_has_no_decision():
    ms = [
        ("Nomination Lodged", date(2024, 10, 10)),
        ("Visa Lodged", date(2025, 1, 2)),
    ]
    lodged, decided, days = processing.derive_span(ms, "waiting")
    # Visa Lodged wins the anchor priority over Nomination Lodged.
    assert lodged == date(2025, 1, 2)
    assert decided is None
    assert days is None


def test_derive_span_lodged_anchor_priority_visa_over_nomination():
    ms = [
        ("Nomination Lodged", date(2024, 10, 10)),
        ("Visa Lodged", date(2025, 1, 2)),
        ("Visa Granted", date(2025, 3, 2)),
    ]
    lodged, decided, _ = processing.derive_span(ms, "granted")
    assert lodged == date(2025, 1, 2)
    assert decided == date(2025, 3, 2)


def test_derive_span_no_anchor_uses_earliest_milestone():
    ms = [
        ("English Test Completed", date(2025, 2, 1)),
        ("EOI Submitted", date(2025, 1, 1)),
    ]
    lodged, decided, days = processing.derive_span(ms, "waiting")
    assert lodged == date(2025, 1, 1)
    assert decided is None


def test_derive_span_empty_is_all_none():
    assert processing.derive_span([], "waiting") == (None, None, None)


def test_derive_span_refused_uses_last_milestone():
    ms = [
        ("Visa Lodged", date(2024, 1, 1)),
        ("S56 Request Received", date(2024, 6, 1)),
    ]
    lodged, decided, days = processing.derive_span(ms, "refused")
    assert lodged == date(2024, 1, 1)
    assert decided == date(2024, 6, 1)
    assert days == 152


# --- identity ---------------------------------------------------------------


def test_generate_handle_shape():
    h = identity.generate_handle()
    assert any(c.isalpha() for c in h)
    assert h[-4:].isdigit()
    assert 1000 <= int(h[-4:]) <= 9999


def test_generate_handle_varies():
    handles = {identity.generate_handle() for _ in range(50)}
    # Overwhelmingly likely to be unique across 50 draws.
    assert len(handles) > 1


def test_generate_color_in_palette():
    assert identity.generate_color() in identity.COLORS


def test_generate_device_token_is_long_hex():
    t = identity.generate_device_token()
    assert len(t) == 48
    int(t, 16)  # parses as hex


def test_initials_two_caps():
    assert identity.initials_of("BoldLagoon7745") == "BL"


def test_initials_single_cap_falls_back_to_first_two():
    assert identity.initials_of("Anonymous") == "AN"
