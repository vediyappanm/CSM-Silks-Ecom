FROM python:3.12-slim

# System deps for WeasyPrint + asyncpg
RUN apt-get update && apt-get install -y \
    gcc libpq-dev libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app/backend:/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["gunicorn", "csm_backend.wsgi:application", "--chdir", "backend", "--bind", "0.0.0.0:8000", "--workers", "4"]
