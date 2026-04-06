from DB.db import feedback_collection


def get_bad_feedback_examples(limit=5):

    records = feedback_collection.find({"rating": "bad"}).limit(limit)

    issues = []

    for r in records:
        issues.append(r.get("answer", ""))

    return issues


def build_improved_prompt(query):

    bad_examples = get_bad_feedback_examples()

    avoid_text = "\n".join(bad_examples)

    return f"""
    You are a professional financial analyst.

    Avoid these poor answer patterns:
    {avoid_text}
    and provide a high-quality answer to this question and use simple words for user understanding.
    give a concise, actionable response with clear reasoning and any relevant data or sources.
    
    Question:
    {query}
    """