FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (e.g. for psycopg2 or other libs)
RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"]
