

import os
import argparse
from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError
import concurrent.futures
from tqdm import tqdm
import time
import logging
from typing import Optional, List, Tuple

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pdf_to_text.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PDFToTextConverter:
    def __init__(self, output_dir: str = "output_texts"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def convert_pdf_to_text(
            self,
            pdf_path: str,
            password: Optional[str] = None,
            pages: Optional[Tuple[int, int]] = None,
            output_file: Optional[str] = None
    ) -> bool:
        """
        Convert a PDF file to text
        Args:
            pdf_path: Path to the PDF file
            password: Password for encrypted PDF (optional)
            pages: Tuple of (start_page, end_page) (1-based indexing)
            output_file: Custom output file path (optional)
        Returns:
            bool: True if conversion was successful, False otherwise
        """
        try:
            # Validate PDF file
            if not os.path.isfile(pdf_path):
                logger.error(f"File not found: {pdf_path}")
                return False

            # Open PDF file
            with open(pdf_path, 'rb') as pdf_file:
                try:
                    reader = PdfReader(pdf_file)

                    # Handle encrypted PDF
                    if reader.is_encrypted:
                        if password:
                            try:
                                if reader.decrypt(password) == 0:
                                    logger.error(f"Failed to decrypt PDF {pdf_path}: Incorrect password")
                                    return False
                            except Exception as e:
                                logger.error(f"Failed to decrypt PDF {pdf_path}: {str(e)}")
                                return False
                        else:
                            logger.error(f"PDF is encrypted and no password provided: {pdf_path}")
                            return False

                    # Determine page range
                    total_pages = len(reader.pages)
                    if pages:
                        start_page = max(1, pages[0]) - 1  # Convert to 0-based
                        end_page = min(total_pages, pages[1])
                    else:
                        start_page = 0
                        end_page = total_pages

                    # Extract text from selected pages
                    text_content = []
                    for page_num in range(start_page, end_page):
                        page = reader.pages[page_num]
                        text = page.extract_text()
                        if text:
                            text_content.append(text)

                    if not text_content:
                        logger.warning(f"No text extracted from {pdf_path}")
                        return False

                    # Prepare output file path
                    if not output_file:
                        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
                        output_file = os.path.join(self.output_dir, f"{base_name}.txt")

                    # Write to text file
                    with open(output_file, 'w', encoding='utf-8') as text_file:
                        text_file.write('\n'.join(text_content))

                    logger.info(f"Successfully converted {pdf_path} to {output_file}")
                    return True

                except PdfReadError as e:
                    logger.error(f"Error reading PDF {pdf_path}: {str(e)}")
                    return False
                except Exception as e:
                    logger.error(f"Error processing {pdf_path}: {str(e)}")
                    return False

        except Exception as e:
            logger.error(f"Unexpected error with {pdf_path}: {str(e)}")
            return False


def process_files(
        file_paths: List[str],
        output_dir: str,
        password: Optional[str] = None,
        pages: Optional[Tuple[int, int]] = None,
        max_workers: int = 4
) -> Tuple[int, int]:
    """
    Process multiple PDF files with parallel processing
    Returns:
        Tuple of (success_count, failure_count)
    """
    converter = PDFToTextConverter(output_dir)
    success_count = 0
    failure_count = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for pdf_path in file_paths:
            futures.append(
                executor.submit(
                    converter.convert_pdf_to_text,
                    pdf_path,
                    password,
                    pages
                )
            )

        # Display progress bar
        with tqdm(total=len(futures), desc="Processing PDFs") as pbar:
            for future in concurrent.futures.as_completed(futures):
                if future.result():
                    success_count += 1
                else:
                    failure_count += 1
                pbar.update(1)

    return success_count, failure_count


def find_pdfs_in_directory(directory: str) -> List[str]:
    """Find all PDF files in a directory and its subdirectories"""
    pdf_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    return pdf_files


def main():
    parser = argparse.ArgumentParser(
        description="Advanced PDF to Text Converter",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        'input_path',
        help='Path to a PDF file or directory containing PDFs'
    )
    parser.add_argument(
        '-o', '--output-dir',
        default='output_texts',
        help='Directory to save converted text files'
    )
    parser.add_argument(
        '-p', '--password',
        help='Password for encrypted PDF files'
    )
    parser.add_argument(
        '--pages',
        nargs=2,
        type=int,
        metavar=('START', 'END'),
        help='Page range to extract (1-based)'
    )
    parser.add_argument(
        '--max-workers',
        type=int,
        default=4,
        help='Maximum number of parallel workers for batch processing'
    )
    parser.add_argument(
        '--log-level',
        default='INFO',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        help='Set the logging level'
    )

    args = parser.parse_args()
    logger.setLevel(args.log_level)

    start_time = time.time()

    # Determine if input is file or directory
    if os.path.isfile(args.input_path):
        pdf_files = [args.input_path]
    elif os.path.isdir(args.input_path):
        pdf_files = find_pdfs_in_directory(args.input_path)
        if not pdf_files:
            logger.error(f"No PDF files found in directory: {args.input_path}")
            return
    else:
        logger.error(f"Invalid input path: {args.input_path}")
        return

    logger.info(f"Found {len(pdf_files)} PDF file(s) to process")

    # Process files
    success, failures = process_files(
        pdf_files,
        args.output_dir,
        args.password,
        tuple(args.pages) if args.pages else None,
        args.max_workers
    )

    # Print summary
    elapsed_time = time.time() - start_time
    logger.info("\nConversion Summary:")
    logger.info(f"  Total PDFs processed: {len(pdf_files)}")
    logger.info(f"  Successful conversions: {success}")
    logger.info(f"  Failed conversions: {failures}")
    logger.info(f"  Time taken: {elapsed_time:.2f} seconds")
    logger.info(f"  Text files saved to: {os.path.abspath(args.output_dir)}")


if __name__ == "__main__":
    main()