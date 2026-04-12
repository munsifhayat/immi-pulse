from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models so Alembic can discover them.
from app.agents.shared import models as shared_models  # noqa: E402,F401
from app.integrations.microsoft import models as microsoft_models  # noqa: E402,F401

# Immigration domain
from app.agents.immigration.users import models as user_models  # noqa: E402,F401
from app.agents.immigration.cases import models as case_models  # noqa: E402,F401
from app.agents.immigration.marketplace import models as marketplace_models  # noqa: E402,F401
from app.agents.immigration.community import models as community_models  # noqa: E402,F401
