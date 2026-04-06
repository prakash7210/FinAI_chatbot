from fastapi.responses import StreamingResponse
import asyncio
from app.RAG.store import process_pdf
from fastapi import APIRouter, HTTPException
from app.api.schemas import QueryRequest, QueryResponse, FeedbackRequest
from app.Services.integration import analyze
from app.Services.feedback_service import store_feedback
from app.api.logger import logger
from bson import ObjectId
from DB.db import chats_collection,messages_collection
from DB.utils import serialize_chat, serialize_message
from fastapi import UploadFile, File
import os

router = APIRouter()


# -----------------------------
# HEALTH CHECK
# -----------------------------
@router.get("/health")
def health():
    return {"status": "ok"}


# -----------------------------
# MAIN ANALYSIS ENDPOINT
# -----------------------------
@router.post("/analyze", response_model=QueryResponse)
def analyze_query(request: QueryRequest):
    try:
        query = request.query
        chat_id = getattr(request, "chatId", None)  # ✅ support optional chatId

        logger.info(f"Received query: {query} | chatId: {chat_id}")

        # ==============================
        # 🔥 BUILD CONTEXT (MEMORY)
        # ==============================
        context = ""

        if chat_id:
            try:
                msgs = list(
                    messages_collection.find(
                        {"chatId": ObjectId(chat_id)}
                    )
                    .sort("_id", -1)
                    .limit(5)
                )

                msgs.reverse()

                for m in msgs:
                    role = "User" if m["isUser"] else "Assistant"
                    context += f"{role}: {m['text']}\n"

            except Exception as db_error:
                logger.error(f"Context fetch error: {str(db_error)}")

        # ==============================
        # 🔥 HANDLE NON-FINANCE / SMALL INPUT
        # ==============================
        if len(query.strip()) < 3:
            return QueryResponse(
                response="Hi 👋 Please ask a detailed question.",
                source="system",
                confidence=1.0,
                latency=0
            )

        # ==============================
        # 🔥 FINAL PROMPT
        # ==============================
        final_query = f"""
You are an intelligent AI assistant.

Conversation so far:
{context}

User: {query}

Instructions:
- Be natural and helpful
- Use context if relevant
- If greeting → respond normally
- If finance → give analysis
"""

        # ==============================
        # 🔥 CALL YOUR AI PIPELINE
        # ==============================
        result = analyze(final_query)

        return QueryResponse(
            response=result.get("response", ""),
            source=result.get("source", "ai"),
            confidence=result.get("confidence", 0.9),
            latency=result.get("latency", 0)
        )

    except Exception as e:
        logger.error(f"Analyze Error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail="Internal Server Error"
        )
    
@router.post("/generate-title")
def generate_title(data: dict):
    query = data["query"]

    # 🔥 simple version (can replace with AI later)
    title = query[:25]

    return {"title": title}


@router.post("/loadpdf")
async def load_pdf(file: UploadFile = File(...)):
    try:
        # 🔥 ensure folder exists
        os.makedirs("data", exist_ok=True)

        filename = file.filename or "upload.pdf"
        file_path = os.path.join("data", filename)

        print("Uploading file:", filename)

        # 🔥 save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 🔥 process file (safe)
        try:
            process_pdf(file_path)
        except Exception as e:
            print("PDF processing error:", e)

        return {"message": "PDF loaded successfully"}

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": str(e)}

# 🔥 CREATE CHAT
@router.post("/chats")
def create_chat(data: dict):
    result = chats_collection.insert_one({
        "title": data["title"]
    })

    return {
        "id": str(result.inserted_id),
        "title": data["title"]
    }


# 🔥 GET ALL CHATS (SIDEBAR)
@router.get("/chats")
def get_chats():
    chats = chats_collection.find().sort("_id", -1)
    return [serialize_chat(c) for c in chats]


# 🔥 SAVE MESSAGE
@router.post("/messages")
def save_message(data: dict):
    messages_collection.insert_one({
        "chatId": ObjectId(data["chatId"]),
        "text": data["text"],
        "isUser": data["isUser"]
    })

    return {"status": "saved"}


# 🔥 GET CHAT MESSAGES
@router.get("/chats/{chat_id}")
def get_chat_messages(chat_id: str):
    msgs = messages_collection.find({
        "chatId": ObjectId(chat_id)
    }).sort("_id", 1)

    return {
        "messages": [serialize_message(m) for m in msgs]
    } 


# -----------------------------
# FEEDBACK ENDPOINT (RLHF)
# -----------------------------
@router.post("/feedback")
def feedback_api(data: dict):

    store_feedback(
        query=data["query"],
        answer=data["answer"],
        rating=data["rating"],
        source=data["source"],
    )

    return {"message": "Feedback saved"}

# -----------------------------
# UPDATE MESSAGE (FOR EDITING)
# -----------------------------
@router.put("/messages/{message_id}")
def update_message(message_id: str, data: dict):
    messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"text": data["text"]}}
    )
    return {"status": "updated"}
# -----------------------------
# DELETE MESSAGE
# -----------------------------
@router.delete("/messages/{message_id}")
def delete_message(message_id: str):
    messages_collection.delete_one(
        {"_id": ObjectId(message_id)}
    )
    return {"status": "deleted"}

# -----------------------------
# UPDATE CHAT
# -----------------------------

@router.put("/chats/{chat_id}")
def update_chat(chat_id: str, data: dict):
    chats_collection.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"title": data["title"]}}
    )
    return {"status": "updated"}
# -----------------------------
# DELETE CHAT (AND ITS MESSAGES)     
# -----------------------------

@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    chats_collection.delete_one(
        {"_id": ObjectId(chat_id)}
    )
    messages_collection.delete_many(
        {"chatId": ObjectId(chat_id)}
    )
    return {"status": "deleted"}