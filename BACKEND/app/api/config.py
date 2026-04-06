import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "Financial AI Analyst"

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")