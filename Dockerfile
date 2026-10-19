FROM python:3.13-slim
WORKDIR /app
COPY index.html style.css engine.js app.js start.py ./
USER 65534:65534
EXPOSE 8765
CMD ["python", "start.py", "--host", "0.0.0.0", "--port", "8765"]
