from DB.db import feedback_collection
from datetime import datetime

def store_feedback(query, answer, rating, source):
    feedback_collection.insert_one({
        "query": query,
        "answer": answer,
        "rating": rating,
        "source": source,  
        "timestamp": datetime.utcnow()
    })