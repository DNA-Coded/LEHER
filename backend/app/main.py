from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Leher API",
    description="Backend API for Leher - Interactive 3D Ocean Intelligence Platform",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include API routes
from app.api.dependencies import api_router
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Leher API",
        "version": "0.1.0",
        "description": "Backend API for Interactive 3D Ocean Intelligence Platform"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)