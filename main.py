from fastapi import FastAPI

app = FastAPI(
    title="AudioCoach API",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "AudioCoach API is running 🚀"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }