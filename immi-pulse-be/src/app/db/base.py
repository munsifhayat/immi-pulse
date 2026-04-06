from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models so Alembic can discover them.
# Shared models (AI usage, activity log)
from app.agents.shared import models as shared_models  # noqa: E402,F401

# Phase 4: Invoice Agent
from app.agents.invoice import models as invoice_models  # noqa: E402,F401
# Phase 5: P1 Classifier
from app.agents.p1_classifier import models as p1_models  # noqa: E402,F401
# Phase 6: Emergent Work
from app.agents.emergent_work import models as emergent_work_models  # noqa: E402,F401
# Phase 7: Compliance
from app.agents.compliance import models as compliance_models  # noqa: E402,F401
# Microsoft integration
from app.integrations.microsoft import models as microsoft_models  # noqa: E402,F401
