import time
from app.model.llm import generate_answer
from app.RAG.rag import retrieve_docs
from app.Services.search_service import search_external
from app.Services.cache_service import cache_get, cache_set
from app.Services.intent_service import classify_intent
from app.Services.rag_filter import is_relevant
from app.Services.rlhf_service import apply_rlhf
from app.Services.prompt_service import build_improved_prompt
from app.Services.query_service import store_query
from app.model.prompt import build_prompt
from app.Services.mode_detector import detect_user_mode
# -----------------------------
# CONFIDENCE    
# -----------------------------
def compute_confidence(response: str):
    if not response:
        return 0.0

    score = 0.5

    if len(response) > 200:
        score += 0.3

    if "risk" in response.lower():
        score += 0.1

    if "recommendation" in response.lower():
        score += 0.1

    if "not sure" in response.lower():
        score -= 0.4

    return max(min(score, 1.0), 0.0)


# -----------------------------
# MAIN PIPELINE
# -----------------------------
def analyze(query: str):

    start_time = time.time()

    # -----------------------------
    # CACHE
    # -----------------------------
    cached = cache_get(query)
    if cached:
        return {
            "response": cached,
            "source": "cache",
            "confidence": 1.0,
            "latency": 0
        }

    # -----------------------------
    # STEP 1: INTENT DETECTION 🔥
    # -----------------------------
    intent = classify_intent(query)
    print(f"Intent: {intent}")

    # -----------------------------
    # STEP 2: REALTIME → SEARCH
    # -----------------------------
    if intent == "realtime":
        print("🔍 Using Search API")

        context = search_external(query)
        final = generate_answer(query, context)

        cache_set(query, final)

        return {
            "response": final,
            "source": "search",
            "confidence": 0.95,
            "latency": round(time.time() - start_time, 2)
        }

    # -----------------------------
    # STEP 3: COMPANY → RAG
    # -----------------------------
    if intent == "rag":
        rag_context = retrieve_docs(query)

        if rag_context and is_relevant(query, rag_context):
            print("✅ Using RAG")

            final = generate_answer(query, rag_context)

            cache_set(query, final)

            return {
                "response": final,
                "source": "rag",
                "confidence": 0.9,
                "latency": round(time.time() - start_time, 2)
            }

    # -----------------------------
    # STEP 4: GENERAL → LLM
    # -----------------------------
    print("🧠 Using LLM")

    initial = generate_answer(query, "")
    confidence = compute_confidence(initial)

    # fallback
    if confidence < 0.6:
        print("🔁 Low confidence → Search")

        context = search_external(query)
        final = generate_answer(query, context)

        source = "search"
        confidence = 0.7
    else:
        final = initial
        source = "llm"

    cache_set(query, final)

    # -----------------------------
    # APPLY RLHF SOURCE ADJUSTMENT
    # -----------------------------
    source = apply_rlhf(query, source)


    # -----------------------------
    # RE-RUN BASED ON NEW SOURCE
    # -----------------------------
    if source == "rag":
        context = retrieve_docs(query)
    elif source == "search":
        context = search_external(query)
    else:
        context = ""

     
     # -----------------------------
    # STEP: DETECT MODE 🔥
    # -----------------------------
    mode = detect_user_mode(query)
    print(f"Detected Mode: {mode}")

    # -----------------------------
    # BUILD SMART PROMPT
    # -----------------------------
    prompt = build_prompt(query, context, mode)

    # -----------------------------
    # GENERATE RESPONSE
    # -----------------------------
    final = generate_answer(prompt, context)
     
    # -----------------------------
    # RLHFIMPROVED PROMPT 🔥
    # -----------------------------
    improved_query = build_improved_prompt(query)

    final = generate_answer(improved_query, context)
    


    # -----------------------------
    # CACHE
    # -----------------------------
    cache_set(query, final)

    # -----------------------------
    # STORE QUERY
    # -----------------------------
    store_query(query, final, source, round(time.time() - start_time, 2))

    return {
        "response": final,
        "source": source,
        "confidence": confidence,
        "latency": round(time.time() - start_time, 2)
    }