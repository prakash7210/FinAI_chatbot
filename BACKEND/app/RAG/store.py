import os
from app.RAG.pdf import extract_text_from_pdf
from app.RAG.rag import add_documents

def process_pdf(file_path):
    # Convert to absolute path
    file_path = os.path.abspath(file_path)

    if not os.path.exists(file_path):
        print("❌ File not found:", file_path)
        return

    text = extract_text_from_pdf(file_path)

    if not text:
        print("No text extracted")
        return

    add_documents([text])

    print("PDF processed successfully.")