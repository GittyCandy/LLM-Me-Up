import sys
import PyPDF2
import textract
import docx
import os
from typing import Optional


def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return None


def extract_text_from_docx(docx_path: str) -> Optional[str]:
    try:
        doc = docx.Document(docx_path)
        return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    except Exception as e:
        print(f"Error extracting text from DOCX: {str(e)}")
        return None


def extract_text_from_txt(txt_path: str) -> Optional[str]:
    try:
        with open(txt_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error extracting text from TXT: {str(e)}")
        return None


def extract_text_from_file(file_path: str) -> Optional[str]:
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_ext == '.docx':
        return extract_text_from_docx(file_path)
    elif file_ext == '.txt':
        return extract_text_from_txt(file_path)
    else:
        try:
            return textract.process(file_path).decode('utf-8')
        except Exception as e:
            print(f"Error extracting text from file: {str(e)}")
            return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python documentProcessor.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    content = extract_text_from_file(file_path)

    if content:
        print(content)
    else:
        print("Failed to extract content from document")
        sys.exit(1)