from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle
)


class PDFReport:
    def __init__(self, filename: str, title: str = "AutoML-AI Report"):
        self.filename = filename
        self.doc = SimpleDocTemplate(
            filename, pagesize=LETTER,
            rightMargin=40, leftMargin=40,
            topMargin=60, bottomMargin=60
        )
        # Base style sheet
        self.styles = getSampleStyleSheet()
        # Add custom styles (avoid name conflicts)
        self.styles.add(ParagraphStyle(
            name="CustomTitle", fontSize=20, leading=24,
            alignment=1, textColor=colors.HexColor("#003366")
        ))
        self.styles.add(ParagraphStyle(
            name="SectionHeading", fontSize=14, leading=18,
            spaceBefore=12, textColor=colors.HexColor("#004C99")
        ))
        self.styles.add(ParagraphStyle(
            name="SectionBody", fontSize=10, leading=12
        ))
        self.elements = []
        self._add_title(title)

    def _add_title(self, text: str):
        self.elements.append(Paragraph(text, self.styles["CustomTitle"]))
        self.elements.append(Spacer(1, 0.2 * inch))

    def add_section(self, heading: str, body: str = None):
        self.elements.append(Paragraph(heading, self.styles["SectionHeading"]))
        if body:
            body = body.replace("\n", "<br/>")
            self.elements.append(Spacer(1, 0.1 * inch))
            self.elements.append(Paragraph(body, self.styles["SectionBody"]))
        self.elements.append(Spacer(1, 0.2 * inch))

    def add_table(self, data: list, col_widths: list = None):
        tbl = Table(data, colWidths=col_widths)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#004C99")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 11),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        self.elements.append(tbl)
        self.elements.append(Spacer(1, 0.2 * inch))

    def build(self):
        def _footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica", 8)
            canvas.drawString(inch, 0.75 * inch, f"Page {doc.page}")
            canvas.restoreState()

        self.doc.build(
            self.elements,
            onFirstPage=_footer,
            onLaterPages=_footer
        )
