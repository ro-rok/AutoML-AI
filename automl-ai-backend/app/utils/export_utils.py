from fpdf import FPDF
import nbformat
from datetime import datetime
import os

class PDFReport(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 10, "AutoML-AI Report", 0, 1, "C")
        self.ln(5)

    def section_title(self, title):
        self.set_font("Arial", "B", 12)
        self.cell(0, 8, title, 0, 1)
        self.ln(2)

    def section_body(self, body):
        self.set_font("Arial", "", 10)
        self.multi_cell(0, 5, body)
        self.ln()

def generate_pdf(session_id: str, metadata: dict, metrics: dict, tips: list) -> str:
    filename = f"{session_id}_report.pdf"
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.section_title("Session Info")
    pdf.section_body(f"Session ID: {session_id}\nGenerated: {datetime.now()}\n\nRows: {metadata['rows']}, Columns: {metadata['columns']}")

    pdf.section_title("Model Evaluation")
    body = "\n".join([f"{k}: {v}" for k, v in metrics.items()])
    pdf.section_body(body)

    if tips:
        pdf.section_title("Assistant Insights")
        pdf.section_body("\n".join(tips))

    pdf.output(filename)
    return filename

def generate_ipynb(code_steps: list, filename: str = "notebook.ipynb") -> str:
    nb = nbformat.v4.new_notebook()
    nb.cells = [nbformat.v4.new_code_cell(code) for code in code_steps]
    nbformat.write(nb, filename)
    return filename
