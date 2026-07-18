"""Pure-pattern tests for the anti-spam detectors.

``antispam.py`` is functions over strings, so every rule can be asserted here
without a session. The enforcement that acts on these signals — rejecting a
write, holding one for review — lives in ``tests/e2e_community_antispam.py``.

Half of this file is deliberately about what must **not** match. A spam filter
is judged by its false positives: the cost of missing one tout is that a
moderator sees it a few minutes later, and the cost of a false positive is that
a real person waiting on a real visa is told they may not say the thing they
came here to say. The "these are ordinary posts" block below is the more
important of the two.
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import pytest

from app.agents.immigration.community import antispam


# --- Ordinary posts must sail through -----------------------------------------

ORDINARY = [
    "My 189 was lodged 12/02/2025 and I'm still waiting. Anyone else?",
    "Got my grant today after 14 months. Hang in there everyone.",
    "Did anyone get an s56 request? Mine arrived at month 9.",
    "I'm weighing up 189 190 491 — is regional really faster?",
    "My agent only ever messages me on WhatsApp, which drives me mad.",
    "Medicals done 2025-03-14, police checks 2025-04-02, still nothing.",
    "The 482 to 186 pathway took 3 years for my partner.",
    "Lodged with 85 points, offshore, ANZSCO 261313.",
    "Cost me $4,240 in visa application charges for the family.",
]


@pytest.mark.parametrize("body", ORDINARY)
def test_ordinary_posts_trip_nothing(body):
    assert antispam.contact_signals(body) == []
    assert antispam.touting_signals(body) == []


def test_naming_a_messaging_app_is_not_a_contact_detail():
    """Describing your agent's habits is the most ordinary content in the room.

    Blocking "my agent messages me on WhatsApp" would refuse exactly the
    first-hand account the room exists to collect. The solicitation form
    ("whatsapp me") is caught by the touting patterns instead, which is
    stronger: those apply at every tier.
    """
    assert antispam.contact_signals("She contacted me on WhatsApp about it") == []
    assert antispam.touting_signals("WhatsApp me and I'll sort it") != []


def test_a_visa_application_charge_is_not_a_quoted_fee():
    """People discuss what the department charged them constantly."""
    assert antispam.touting_signals("The VAC was $4,240 for us") == []


# --- Links --------------------------------------------------------------------


def test_a_bare_domain_is_a_link():
    assert antispam.find_links("see best-migration-agents.com today")


def test_an_obfuscated_domain_is_a_link():
    """The variant a spammer writes once they learn bare domains are caught."""
    assert antispam.find_links("visit myagency dot com")
    assert antispam.find_links("visit myagency(dot)com")
    assert antispam.find_links("visit myagency [.] com")


def test_official_sources_are_always_linkable():
    """The one deliberate hole in the gate, and it is load-bearing.

    Pointing someone at the department's own page is the single most useful
    thing one applicant can do for another, and it is a link no tout will ever
    post — nobody sells a visa service by linking to homeaffairs.gov.au.
    """
    assert antispam.find_links("https://immi.homeaffairs.gov.au/visas/x") == []
    assert antispam.find_links("check legislation.gov.au for the reg") == []


def test_a_lookalike_domain_is_not_allowlisted():
    """Suffix matching must not be substring matching."""
    assert antispam.find_links("go to homeaffairs.gov.au.visa-help.com now")


def test_an_allowed_link_does_not_shield_a_second_link():
    found = antispam.find_links(
        "official: https://immi.homeaffairs.gov.au/x — or use my-agency.com"
    )
    assert any("my-agency.com" in f for f in found)


# --- Phone numbers ------------------------------------------------------------


@pytest.mark.parametrize(
    "body",
    [
        "call +61 400 123 456",
        "ring 0412 345 678",
        "my number is 0412345678",
        "+91 98765 43210",
    ],
)
def test_phone_numbers_are_found(body):
    assert antispam.find_phone_numbers(body)


@pytest.mark.parametrize(
    "body",
    [
        "I'm weighing up 189 190 491",
        "lodged 12/02/2025",
        "waiting 400 days now",
        "subclass 482 stream 2",
    ],
)
def test_forum_numbers_are_not_phone_numbers(body):
    """Subclass numbers, dates and day counts are the room's native vocabulary."""
    assert antispam.find_phone_numbers(body) == []


# --- Handles ------------------------------------------------------------------


def test_email_addresses_and_handles_are_contact_details():
    assert antispam.find_handles("write to agent.mike@migration.com")
    assert antispam.find_handles("find me @agentmike")
    assert antispam.find_handles("wa.me/61400111222")


def test_the_at_dodge_is_caught():
    assert antispam.find_handles("agentmike at migration dot com")


# --- Touting ------------------------------------------------------------------


@pytest.mark.parametrize(
    "body,expected_fragment",
    [
        ("I can lodge your 189 for you", "lodge"),
        ("We will prepare your nomination, no stress", "lodge"),
        ("My fee is very reasonable for a full application", "fee"),
        ("PR package $2500 all inclusive", "price"),
        ("DM me for help with your PR", "contacted privately"),
        ("Contact me on my cell for details", "contacted privately"),
        ("100% guaranteed visa grant", "guaranteed"),
        ("No visa no fee, sure shot approval", "guaranteed"),
        ("We are a registered migration agency, contact us today", "advertising"),
    ],
)
def test_touting_is_caught(body, expected_fragment):
    reasons = antispam.touting_signals(body)
    assert reasons, f"nothing matched: {body!r}"
    assert any(expected_fragment in r for r in reasons), reasons


@pytest.mark.parametrize(
    "body",
    [
        "I lodged my own 189 without an agent and it was fine",
        "You can lodge your own application, it isn't hard",
        "My agent lodged mine in February",
        "Has anyone used a registered agent for a 186?",
    ],
)
def test_talking_about_agents_is_not_touting(body):
    """Discussing agents is the room's subject matter, not an offence."""
    assert antispam.touting_signals(body) == []


# --- Fingerprinting -----------------------------------------------------------


def test_short_bodies_are_never_fingerprinted():
    """Short repeated replies are the normal texture of a waiting room.

    "Any update?" posted in thirty threads over a year is somebody waiting, not
    somebody spamming, and holding those would hold the most ordinary
    contributions in the product.
    """
    assert antispam.fingerprint("thanks!") is None
    assert antispam.fingerprint("same here, still waiting") is None


def test_a_long_body_fingerprints_stably():
    body = "I lodged my 189 in February 2025 with 85 points and I am still waiting."
    assert antispam.fingerprint(body) == antispam.fingerprint(body)


def test_trivial_edits_do_not_defeat_the_fingerprint():
    """Casing, punctuation and stray whitespace are what a paster changes."""
    a = "Best migration agent in Sydney, contact us for a free assessment today!"
    b = "best migration agent in sydney -- CONTACT US for a free assessment today"
    assert antispam.fingerprint(a) == antispam.fingerprint(b)


def test_different_bodies_fingerprint_differently():
    a = antispam.fingerprint("I lodged my 189 in February 2025 and I am waiting.")
    b = antispam.fingerprint("I lodged my 190 in March 2025 and I am waiting.")
    assert a != b
