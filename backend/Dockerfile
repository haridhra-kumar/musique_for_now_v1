FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONPATH=/app
ENV PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org pypi.python.org"

RUN --mount=type=cache,target=/root/.cache/pip pip install setuptools wheel

COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip pip install --no-build-isolation crepe==0.0.16

RUN --mount=type=cache,target=/root/.cache/pip pip install "tensorflow>=2.16.0,<3.0"

RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY . .

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
