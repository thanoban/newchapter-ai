FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /service
COPY pyproject.toml ./
COPY newchapter ./newchapter
RUN pip install --no-cache-dir .

USER 65532:65532
CMD ["sh", "-c", "uvicorn newchapter.main:app --host 0.0.0.0 --port ${PORT}"]
