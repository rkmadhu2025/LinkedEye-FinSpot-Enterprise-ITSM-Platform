from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime
import os

def generate_pdf_report(file_path: str, report_data: dict, title: str = "ITSM Report"):
    """
    Generate a PDF report using ReportLab.
    
    Args:
        file_path: Absolute path to save the PDF
        report_data: Dictionary containing report content
        title: Report title
    """
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph(title, styles['Title']))
    story.append(Spacer(1, 12))
    
    # Metadata
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], textColor=colors.gray)
    story.append(Paragraph(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", meta_style))
    story.append(Spacer(1, 24))

    # Description if present
    if report_data.get("description"):
        story.append(Paragraph(report_data["description"], styles['Normal']))
        story.append(Spacer(1, 12))

    # Handle summary/stats
    if "stats" in report_data:
        story.append(Paragraph("Summary Statistics", styles['Heading2']))
        data = [['Metric', 'Value']]
        for key, value in report_data['stats'].items():
            data.append([key.replace('_', ' ').title(), str(value)])
            
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(t)
        story.append(Spacer(1, 24))

    # Build PDF
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    doc.build(story)
    return file_path
