"""Pure-logic checks for the adaptive share form's request contract.

No DB, no app — just the Pydantic models, which is where the two invariants that
matter most are enforced:

  * **Consent cannot happen by omission.** ``publish`` is required with no
    default. It used to default to true in the service layer, so a caller that
    simply did not think about it published somebody's visa timeline.

  * **Timelines run forwards.** A milestone dated before the one above it is a
    typo, and it is one of the few kinds of dirty data that is observable rather
    than merely suspected.
"""

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.agents.immigration.community.schemas import (
    AddMilestonesRequest,
    CreateJourneyRequest,
    MilestoneIn,
)

LODGED = date.today() - timedelta(days=200)
MEDICAL = date.today() - timedelta(days=120)
GRANTED = date.today() - timedelta(days=20)


def _ms(mtype: str, when: date) -> dict:
    return {"milestone_type": mtype, "occurred_on": when}


def _timeline(**over) -> dict:
    base = {
        "publish": True,
        "post_type": "timeline",
        "subclass_slug": "189-points-tested",
        "outcome": "waiting",
        "milestones": [_ms("Visa Lodged", LODGED)],
    }
    base.update(over)
    return base


# --- Consent -----------------------------------------------------------------


def test_publish_is_required():
    """Omitting it is a validation error, not a silent publish."""
    payload = _timeline()
    del payload["publish"]
    with pytest.raises(ValidationError) as err:
        CreateJourneyRequest(**payload)
    assert "publish" in str(err.value)


def test_publish_can_be_false_for_a_draft():
    req = CreateJourneyRequest(**_timeline(publish=False))
    assert req.publish is False


# --- Monotonic milestones ----------------------------------------------------


def test_backwards_milestones_are_refused():
    """The shape seen in the wild: a grant, then an EOI dated after it."""
    with pytest.raises(ValidationError) as err:
        CreateJourneyRequest(
            **_timeline(
                milestones=[_ms("Visa Granted", GRANTED), _ms("EOI Submitted", LODGED)]
            )
        )
    assert "forwards" in str(err.value)


def test_forwards_milestones_pass():
    req = CreateJourneyRequest(
        **_timeline(
            milestones=[
                _ms("Visa Lodged", LODGED),
                _ms("Medical Examination", MEDICAL),
                _ms("Visa Granted", GRANTED),
            ]
        )
    )
    assert len(req.milestones) == 3


def test_same_day_milestones_pass():
    """Several things genuinely happen on one day; rejecting that would push
    authors into inventing offsets."""
    req = CreateJourneyRequest(
        **_timeline(
            milestones=[_ms("Visa Lodged", LODGED), _ms("Police Checks", LODGED)]
        )
    )
    assert len(req.milestones) == 2


def test_appended_milestones_are_checked_within_the_batch():
    with pytest.raises(ValidationError):
        AddMilestonesRequest(
            milestones=[
                MilestoneIn(milestone_type="Visa Granted", occurred_on=GRANTED),
                MilestoneIn(milestone_type="Medical Examination", occurred_on=MEDICAL),
            ]
        )


def test_a_question_is_not_subject_to_milestone_ordering():
    """Questions carry no milestones at all — the validator must not reach in."""
    req = CreateJourneyRequest(
        publish=True,
        post_type="question",
        title="Is a five month wait normal for a 500?",
        note="Lodged in March and still nothing.",
    )
    assert req.milestones == []


# --- Context fields ----------------------------------------------------------


def test_context_fields_round_trip():
    req = CreateJourneyRequest(
        **_timeline(
            lodgement_location="offshore",
            nationality="Indian",
            lodged_via="agent",
            direct_grant=True,
        )
    )
    assert req.lodgement_location == "offshore"
    assert req.lodged_via == "agent"
    assert req.direct_grant is True


def test_direct_grant_keeps_its_third_state():
    """None ("didn't say") must survive as distinct from False ("there was
    contact") — collapsing them loses the assertion the field exists for."""
    assert CreateJourneyRequest(**_timeline()).direct_grant is None
    assert CreateJourneyRequest(**_timeline(direct_grant=False)).direct_grant is False


@pytest.mark.parametrize("bad", ["Onshore", "in australia", "", "both"])
def test_lodgement_location_is_constrained(bad):
    with pytest.raises(ValidationError):
        CreateJourneyRequest(**_timeline(lodgement_location=bad))


def test_journey_out_never_carries_nationality():
    """The schema itself must not have the field — a serializer cannot leak what
    it cannot express."""
    from app.agents.immigration.community.schemas import JourneyOut

    assert "nationality" not in JourneyOut.model_fields
