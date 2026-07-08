FROM python:3.11-slim

RUN apt-get update && apt-get install -y tesseract-ocr libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY scripts/ /app/scripts/
COPY scripts/startup.sh /startup.sh
RUN chmod +x /startup.sh
ENV BRIAN_AI_DATA_DIR=/data

EXPOSE 8000
CMD ["/startup.sh"]
