FROM python:3.11-slim

# Create user for Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy requirements first for better caching
COPY --chown=user:user requirements.txt requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=user:user . .

# Ensure Python can find the app module
ENV PYTHONPATH=/app

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Run the application - используем app.main:app вместо app:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]