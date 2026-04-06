def rank_context(context: str):
    """
    Basic ranking logic
    (later replace with reranker models)
    """

    chunks = context.split("\n")

    # prioritize longer meaningful chunks
    ranked = sorted(chunks, key=lambda x: len(x), reverse=True)

    return "\n".join(ranked[:3])