.PHONY: install dev start test migrate

install:
	pip install -r requirements/base.txt

dev:
	PYTHONPATH=src python -m app.core.server

test:
	PYTHONPATH=src pytest tests/ -v

migrate:
	PYTHONPATH=src alembic upgrade head

migration:
	PYTHONPATH=src alembic revision --autogenerate -m "$(msg)"

downgrade:
	PYTHONPATH=src alembic downgrade -1
