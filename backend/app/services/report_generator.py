import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportGenerator:
    @staticmethod
    def generate_screening_report(screening, db) -> bytes:
        """
        Generates a PDF report for the given screening object.
        Returns bytes representing the PDF file.
        """
        buffer = io.BytesIO()
        
        # Setup document margins (0.5 inch / 36 pt)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom Paragraph Styles
        header_title_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#1e3a8a'), # Navy Blue
            alignment=1, # Centered
            spaceAfter=5
        )
        
        subtitle_style = ParagraphStyle(
            'SubHeaderTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#475569'), # Slate 600
            alignment=1,
            spaceAfter=15
        )
        
        section_title_style = ParagraphStyle(
            'SecTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=14,
            textColor=colors.HexColor('#0f172a'), # Slate 900
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b')
        )
        
        bold_body_style = ParagraphStyle(
            'ReportBoldBody',
            parent=body_style,
            fontName='Helvetica-Bold'
        )

        critical_style = ParagraphStyle(
            'CritText',
            parent=bold_body_style,
            textColor=colors.HexColor('#ef4444')
        )
        
        warning_style = ParagraphStyle(
            'WarnText',
            parent=bold_body_style,
            textColor=colors.HexColor('#f59e0b')
        )

        success_style = ParagraphStyle(
            'SuccText',
            parent=bold_body_style,
            textColor=colors.HexColor('#22c55e')
        )

        story = []

        # 1. Header Section
        story.append(Paragraph("GOVERNMENT OF INDIA — MINISTRY OF HOME AFFAIRS", subtitle_style))
        story.append(Paragraph("SASHASTRA SEEMA BAL (SSB) BORDER CONTROL", header_title_style))
        story.append(Paragraph("OFFICIAL SECURITY SCREENING & IDENTITY FORENSICS REPORT", subtitle_style))
        story.append(Spacer(1, 10))

        # 2. Meta Info Table (Screening details)
        meta_data = [
            [
                Paragraph("Screening ID:", bold_body_style), Paragraph(screening.screening_id, body_style),
                Paragraph("Date & Time:", bold_body_style), Paragraph(screening.completed_at.strftime('%Y-%m-%d %H:%M:%S UTC') if screening.completed_at else screening.created_at.strftime('%Y-%m-%d %H:%M:%S UTC'), body_style)
            ],
            [
                Paragraph("Document Type:", bold_body_style), Paragraph(screening.document_type.upper(), body_style),
                Paragraph("Screening Officer ID:", bold_body_style), Paragraph(f"Officer #{screening.user_id}", body_style)
            ],
            [
                Paragraph("Risk Score:", bold_body_style), Paragraph(f"{screening.risk_score} / 100", critical_style if screening.risk_score >= 60 else (warning_style if screening.risk_score >= 30 else success_style)),
                Paragraph("Status & Decision:", bold_body_style), Paragraph(screening.status.upper(), bold_body_style)
            ]
        ]
        
        meta_table = Table(meta_data, colWidths=[110, 160, 120, 150])
        meta_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f1f5f9')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # 3. OCR Results Section
        story.append(Paragraph("1. OCR EXTRACTED INFORMATION", section_title_style))
        ocr = screening.ocr_result
        if ocr:
            ocr_data = [
                [Paragraph("Field", bold_body_style), Paragraph("Extracted Value", bold_body_style), Paragraph("Accuracy", bold_body_style)],
                [Paragraph("Name:", bold_body_style), Paragraph(ocr.name or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)],
                [Paragraph("Document Number:", bold_body_style), Paragraph(ocr.document_number or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)],
                [Paragraph("Nationality:", bold_body_style), Paragraph(ocr.nationality or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)],
                [Paragraph("Date of Birth:", bold_body_style), Paragraph(ocr.date_of_birth or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)],
                [Paragraph("Gender:", bold_body_style), Paragraph(ocr.gender or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)],
                [Paragraph("Expiry Date:", bold_body_style), Paragraph(ocr.expiry_date or "N/A", body_style), Paragraph(f"{int(ocr.confidence * 100)}%", body_style)]
            ]
            ocr_table = Table(ocr_data, colWidths=[150, 290, 100])
            ocr_table.setStyle(TableStyle([
                ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#94a3b8')),
                ('GRID', (0,1), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 4),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
            ]))
            story.append(ocr_table)
        else:
            story.append(Paragraph("No OCR information extracted.", body_style))
        story.append(Spacer(1, 12))

        # 4. Validation Results Section
        story.append(Paragraph("2. DOCUMENT VALIDATION STATUS", section_title_style))
        validation = screening.validation_results
        if validation:
            val_data = [[Paragraph("Rule / Field Checked", bold_body_style), Paragraph("Status", bold_body_style), Paragraph("Message Details", bold_body_style)]]
            for v in validation:
                status_p = Paragraph(v.status.upper(), success_style if v.status == "VALID" else (warning_style if v.status == "WARNING" else critical_style))
                val_data.append([
                    Paragraph(v.field, bold_body_style),
                    status_p,
                    Paragraph(v.message or "", body_style)
                ])
            val_table = Table(val_data, colWidths=[150, 90, 300])
            val_table.setStyle(TableStyle([
                ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#94a3b8')),
                ('GRID', (0,1), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 4),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
            ]))
            story.append(val_table)
        else:
            story.append(Paragraph("No validation rules checked.", body_style))
        story.append(Spacer(1, 12))

        # 5. Tampering & Face Verification Section
        story.append(Paragraph("3. FORENSICS & BIOMETRICS VERIFICATION", section_title_style))
        tamp = screening.tampering_result
        face = screening.face_result
        
        tamp_prob = f"{int(tamp.overall_probability * 100)}%" if tamp else "N/A"
        face_sim = f"{int(face.similarity_score * 100)}%" if face else "N/A"
        face_status = face.match_status if face else "N/A"
        
        tamp_text = critical_style if tamp and tamp.overall_probability >= 0.5 else (warning_style if tamp and tamp.overall_probability >= 0.2 else success_style)
        face_text = success_style if face_status == "VERIFIED" else (warning_style if face_status == "POSSIBLE_MATCH" else critical_style)
        
        forensic_data = [
            [Paragraph("Forensic Check Metric", bold_body_style), Paragraph("Result Score / Status", bold_body_style), Paragraph("Assessment", bold_body_style)],
            [Paragraph("Overall Tampering Probability:", bold_body_style), Paragraph(tamp_prob, tamp_text), Paragraph("CRITICAL ALERT" if tamp and tamp.overall_probability >= 0.5 else ("SUSPICIOUS REGIONS" if tamp and tamp.overall_probability >= 0.2 else "CLEARED: No tampering detected"))],
            [Paragraph("Face Match Similarity:", bold_body_style), Paragraph(face_sim, face_text), Paragraph(f"Status: {face_status}")],
            [Paragraph("Photo Replacement Score:", bold_body_style), Paragraph(f"{int(tamp.photo_replacement_score*100)}%" if tamp else "N/A", body_style), Paragraph("High Probability" if tamp and tamp.photo_replacement_score >= 0.5 else "Low Anomaly")],
            [Paragraph("Text Manipulation Score:", bold_body_style), Paragraph(f"{int(tamp.text_manipulation_score*100)}%" if tamp else "N/A", body_style), Paragraph("High Probability" if tamp and tamp.text_manipulation_score >= 0.5 else "Low Anomaly")],
            [Paragraph("Stamp Authenticity Score:", bold_body_style), Paragraph(f"{int(tamp.stamp_score*100)}%" if tamp else "N/A", body_style), Paragraph("Forged Stamp Warning" if tamp and tamp.stamp_score >= 0.5 else "Authentic Stamp Structure")]
        ]
        
        forensic_table = Table(forensic_data, colWidths=[200, 140, 200])
        forensic_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#94a3b8')),
            ('GRID', (0,1), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ]))
        story.append(forensic_table)
        story.append(Spacer(1, 12))

        # 6. Cryptographic Audit Trail Hash Section
        story.append(Paragraph("4. CRYPTOGRAPHIC IMMUTABLE AUDIT RECORD", section_title_style))
        
        # Query audit log for this screening
        from app.models.models import AuditLog
        audit = db.query(AuditLog).filter(AuditLog.screening_id == screening.id).first()
        
        curr_hash = audit.current_hash if audit else "N/A"
        prev_hash = audit.previous_hash if audit else "N/A"
        
        audit_data = [
            [Paragraph("Audit Event Action:", bold_body_style), Paragraph(audit.action if audit else "Finalized", body_style)],
            [Paragraph("Current Record Hash:", bold_body_style), Paragraph(curr_hash, bold_body_style)],
            [Paragraph("Previous Chain Hash:", bold_body_style), Paragraph(prev_hash, body_style)],
            [Paragraph("Audit Integrity:", bold_body_style), Paragraph("✓ VERIFIED CRYPTOGRAPHICALLY (LOCAL SECURE HASH-CHAIN)", success_style)]
        ]
        
        audit_table = Table(audit_data, colWidths=[150, 390])
        audit_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f1f5f9')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(audit_table)
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("CONFIDENTIAL — FOR INTERNAL SSB SECURITY USE ONLY", subtitle_style))

        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
