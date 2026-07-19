"""Pure-logic tests for the ANZSCO occupation dataset.

No database and no HTTP — the HTML parsers in
``scripts/fetch_dha_occupations.py`` and the edition resolver on the
``Occupation`` model. The API surface (filter by subclass, typeahead, the
required/hidden rule on the write path) lives in
``tests/e2e_community_occupations.py``.

The fetcher is scraping markup that no one owes us stability on, so its parsers
are the part most likely to break silently and the part with no runtime signal
when it does — a mangled row just quietly stops matching anything.
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import importlib.util
import pathlib

import pytest

from app.agents.immigration.community.models import Occupation

_FETCHER_PATH = (
    pathlib.Path(__file__).resolve().parents[3] / "scripts" / "fetch_dha_occupations.py"
)
_spec = importlib.util.spec_from_file_location("fetch_dha_occupations", _FETCHER_PATH)
fetcher = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fetcher)


# --- Code extraction --------------------------------------------------------


def test_single_edition_row_yields_one_code():
    """255 occupations carry only a 2013 code and 43 only a 2022 one."""
    fragment = (
        "<a class='external' aria-label='ANZSCO 2013 - 411511 - external link' "
        "href='http://example.test'>ANZSCO 2013 - 411511</a>"
    )
    codes, applies = fetcher.parse_codes(fragment)
    assert codes == {"2013": "411511"}
    assert applies == []


def test_dual_edition_row_yields_both_codes_and_the_2022_applicability():
    """The applicability rule is read from the department's own label.

    Hardcoding "2022 means 186 and 482" would put the rule in our code instead
    of in their data, where it can be re-read every refresh.
    """
    fragment = (
        "<p><a aria-label='ANZSCO 2022 - Subclass 186 and 482 visas - 221111 "
        "- external link' href='http://a.test'>ANZSCO 2022 - Subclass 186 and "
        "482 visas - 221111</a></p>"
        "<p><a aria-label='ANZSCO 2013 - all other visas - 221111 - external "
        "link' href='http://b.test'>ANZSCO 2013 - all other visas - 221111</a></p>"
    )
    codes, applies = fetcher.parse_codes(fragment)
    assert codes == {"2013": "221111", "2022": "221111"}
    assert applies == ["186", "482"]


def test_en_dash_separator_is_parsed():
    """Arborist — and only Arborist — separates with an en dash.

    Matching only the ASCII hyphen drops it, and Arborist is one of the seven
    occupations whose two editions actually differ, so it is precisely the row
    that cannot be lost. This test exists because that is exactly what happened.
    """
    fragment = (
        "<a href='http://a.test'>ANZSCO 2022 – Subclass 186 and 482 visas - "
        "​362511</a><a href='http://b.test'>ANZSCO 2013 – 362212</a>"
    )
    codes, _ = fetcher.parse_codes(fragment)
    assert codes == {"2013": "362212", "2022": "362511"}


def test_zero_width_space_before_a_code_is_stripped():
    fragment = "<a href='http://a.test'>ANZSCO 2013 - ​234518</a>"
    codes, _ = fetcher.parse_codes(fragment)
    assert codes == {"2013": "234518"}


def test_aria_label_repeat_does_not_produce_a_second_code():
    """The code appears twice per anchor — in the aria-label and in the text.

    ``setdefault`` keeps the first, so a row cannot come out with a code that
    depends on markup ordering.
    """
    fragment = (
        "<a aria-label='ANZSCO 2013 - 261313 - external link'>"
        "ANZSCO 2013 - 261313</a>"
    )
    codes, _ = fetcher.parse_codes(fragment)
    assert codes == {"2013": "261313"}


def test_unparseable_fragment_yields_nothing_rather_than_a_guess():
    codes, applies = fetcher.parse_codes("<p>See the ABS website.</p>")
    assert codes == {}
    assert applies == []


# --- Subclass extraction ----------------------------------------------------


def test_leading_number_is_the_subclass_not_the_parenthetical_repeat():
    visas = (
        "189 - Skilled Independent  (subclass 189) - Points-Tested;"
        "190 - Skilled Nominated   (subclass 190);"
        "494 - Skilled Employer Sponsored Regional (provisional) (subclass 494)"
        " - Employer sponsored stream;"
    )
    assert fetcher.parse_subclasses(visas, []) == ["189", "190", "494"]


def test_repealed_subclasses_are_dropped():
    """489 was replaced by 491 in 2019 and has no row in our taxonomy.

    Carrying it would flag ``requires_occupation`` for a visa that does not
    exist on our side.
    """
    visas = "489 - Skilled Regional (Provisional) visa (subclass 489) - Family sponsored;"
    assert fetcher.parse_subclasses(visas, []) == []


def test_rsms_rol_rows_fall_back_to_subclass_187():
    """The 23 RSMS ROL rows carry an empty ``visas`` field.

    Without the fallback, subclass 187 — a visa that unambiguously has a
    nominated occupation — would come out needing none.
    """
    assert fetcher.parse_subclasses("", ["RSMS ROL"]) == ["187"]


def test_no_visas_and_no_known_list_yields_nothing():
    assert fetcher.parse_subclasses("", ["MLTSSL"]) == []


# --- Assessing authority ----------------------------------------------------


def test_authority_acronym_and_url_are_extracted():
    fragment = (
        "<div><ul><li><a href='javascript:void(0);'>VETASSESS</a>"
        "<div class='hide'><span>Assessing authority</span>"
        "<p><span>Vocational Education and Training Assessment Services</span></p>"
        "<p><a href='https&#58;//www.vetassess.com.au/'>vetassess</a></p>"
        "</div></li></ul></div>"
    )
    name, url = fetcher.parse_authority(fragment)
    assert name == "VETASSESS"
    assert url == "https://www.vetassess.com.au/"


def test_missing_authority_is_none_not_empty_string():
    """24 rows name no authority. "Unknown" and "none required" must stay
    distinguishable downstream."""
    assert fetcher.parse_authority("") == (None, None)


# --- Slugs ------------------------------------------------------------------


def test_slug_keeps_parenthetical_qualifiers():
    """The taxonomy's slugify drops parentheticals; this one must not.

    "Accountant (General)" and "Accountant (Taxation)" are different
    occupations with different codes and different assessing outcomes, and the
    slug is the seeder's natural key — collapsing them would merge two rows on
    every run.
    """
    a = fetcher.slugify("Accountant (General)")
    b = fetcher.slugify("Accountant (Taxation)")
    assert a != b
    assert a == "accountant-general"


def test_slug_is_stable_across_punctuation_and_case():
    assert fetcher.slugify("Plumber (General)") == "plumber-general"
    assert fetcher.slugify("ICT  Business   Analyst") == "ict-business-analyst"


# --- Edition resolution -----------------------------------------------------


def _occ(code_2013=None, code_2022=None):
    return Occupation(
        slug="x", name="X", anzsco_2013_code=code_2013, anzsco_2022_code=code_2022
    )


@pytest.mark.parametrize(
    "version,expected",
    [("2022", "362511"), ("2013", "362212"), (None, "362212")],
)
def test_divergent_occupation_resolves_per_edition(version, expected):
    """Arborist: 362212 under 2013, 362511 under 2022.

    A NULL version falls to 2013 — the edition every subclass except 186 and
    482 reads.
    """
    assert _occ("362212", "362511").code_for_version(version) == expected


def test_single_edition_occupation_falls_back_rather_than_returning_none():
    """43 occupations exist only under the 2022 edition.

    A 189 applicant picking one of those should still get a code stamped. A
    code from the other edition is recoverable — both columns are stored — while
    a NULL is the free-text problem all over again.
    """
    assert _occ(None, "221111").code_for_version("2013") == "221111"
    assert _occ("411511", None).code_for_version("2022") == "411511"


def test_an_occupation_with_no_codes_resolves_to_none():
    assert _occ().code_for_version("2013") is None
