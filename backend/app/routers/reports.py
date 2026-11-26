from io import BytesIO
from datetime import datetime, timezone
from xml.sax.saxutils import escape
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.services.readiness_service import calculate_readiness
router = APIRouter(prefix="/reports", tags=["Reports"])
def safe_text(value) -> str:
    return escape(str(value if value is not None else "N/A"))
def add_page_footer(canvas, document):
    canvas.saveState()
    page_width, _ = A4
    canvas.setStrokeColor(colors.HexColor("#DCE3EF"))
    canvas.line(18 * mm, 15 * mm, page_width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(18 * mm, 10 * mm, "TripGuard - Travel Readiness Report")
    canvas.drawRightString(page_width - 18 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()
# Dono route chalenge - .pdf wala bhi, bina .pdf wala bhi
@router.get("/trips/{trip_id}.pdf")
@router.get("/trips/{trip_id}")
def trip_report(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = db.get(Trip, trip_id)
    if not trip or (user.role != "admin" and trip.user_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    readiness = calculate_readiness(trip)
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=22 * mm, title="TripGuard Travel Readiness Report", author="TripGuard")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=21, leading=26, alignment=TA_CENTER, textColor=colors.HexColor("#173B70"), spaceAfter=8)
    subtitle_style = ParagraphStyle("ReportSubtitle", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor("#64748B"), spaceAfter=16)
    section_style = ParagraphStyle("SectionHeading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=colors.HexColor("#173B70"), spaceBefore=12, spaceAfter=8)
    body_style = ParagraphStyle("ReportBody", parent=styles["Normal"], fontSize=9, leading=14, textColor=colors.HexColor("#334155"))
    small_style = ParagraphStyle("SmallText", parent=body_style, fontSize=8, leading=11)
    story = []
    story.append(Paragraph("TRIPGUARD", title_style))
    story.append(Paragraph("TRAVEL READINESS REPORT", subtitle_style))
    generated_at = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")
    story.append(Paragraph(f"Generated on: {generated_at}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DCE3EF")))
    story.append(Paragraph("1. Trip Information", section_style))
    trip_rows = [
        ["Trip title", safe_text(trip.title)],
        ["Employee reference", str(trip.user_id)],
        ["Origin", safe_text(trip.origin_city)],
        ["Destination", safe_text(f"{trip.destination_city}, {trip.destination_country or ''}")],
        ["Purpose", safe_text(trip.purpose)],
        ["Departure date", str(trip.departure_date)],
        ["Return date", str(trip.return_date)],
        ["Trip status", safe_text(trip.status)],
        ["Budget", (f"{trip.budget_amount} {safe_text(trip.budget_currency)}" if trip.budget_amount is not None else "Not provided")],
    ]
    trip_table = Table([[Paragraph(f"<b>{safe_text(label)}</b>", body_style), Paragraph(value, body_style)] for label, value in trip_rows], colWidths=[48 * mm, 112 * mm])
    trip_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")), ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#334155")), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DCE3EF")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(trip_table)
    story.append(Paragraph("2. Readiness Assessment", section_style))
    score = readiness["score"]
    risk = readiness["risk_level"].upper()
    risk_colors = {"LOW": colors.HexColor("#15803D"), "MEDIUM": colors.HexColor("#D97706"), "HIGH": colors.HexColor("#DC2626")}
    score_table = Table([[Paragraph(f"<b>{score}/100</b>", ParagraphStyle("Score", parent=body_style, fontSize=24, alignment=TA_CENTER, textColor=colors.HexColor("#173B70"))), Paragraph(f"<b>{risk} RISK</b>", ParagraphStyle("Risk", parent=body_style, fontSize=16, alignment=TA_CENTER, textColor=risk_colors.get(risk, colors.HexColor("#334155"))))]], colWidths=[80 * mm, 80 * mm], rowHeights=[22 * mm])
    score_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#DCE3EF")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story.append(score_table)
    story.append(Spacer(1, 8))
    story.append(Paragraph(safe_text(readiness["explanation"]), body_style))
    story.append(Paragraph("3. Readiness Score Breakdown", section_style))
    breakdown = readiness.get("score_breakdown") or {}
    # Nayi + purani dono readiness_service ke keys handle karega
    def _points(*keys, default=0):
        for k in keys:
            if k in breakdown:
                return breakdown[k]
        return default
    checklist_pts = _points("checklist", "checklist_completion")
    weather_pts = _points("weather", "weather_risk")
    proximity_pts = _points("proximity", "departure_proximity")
    details_pts = _points("details", "trip_details")
    setup_pts = _points("checklist_setup", "setup")
    breakdown_rows = [
        ["Assessment component", "Points"],
        ["Checklist completion", f"{checklist_pts}/40"],
        ["Weather risk", f"{weather_pts}/30"],
        ["Departure proximity", f"{proximity_pts}/20"],
        ["Trip details", f"{details_pts}/10"],
    ]
    if setup_pts:
        breakdown_rows.append(["Checklist setup", f"{setup_pts}/20"])
    breakdown_rows.append(["TOTAL READINESS", f"{score}/100"])
    breakdown_table = Table(breakdown_rows, colWidths=[115 * mm, 45 * mm], repeatRows=1)
    breakdown_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#173B70")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E8EEF8")), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DCE3EF")), ("ALIGN", (1, 0), (1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("PADDING", (0, 0), (-1, -1), 8)]))
    story.append(breakdown_table)
    story.append(Paragraph("4. Preparation Checklist", section_style))
    progress = readiness["checklist_progress"]
    story.append(Paragraph(f"Completed tasks: <b>{progress['completed']}</b> out of <b>{progress['total']}</b>", body_style))
    story.append(Spacer(1, 8))
    checklist_rows = [["Status", "Preparation task"]]
    for item in trip.checklist_items:
        checklist_rows.append(["Completed" if item.is_completed else "Pending", Paragraph(safe_text(item.title), body_style)])
    if not trip.checklist_items:
        checklist_rows.append(["Pending", "No preparation tasks have been added."])
    checklist_table = Table(checklist_rows, colWidths=[38 * mm, 122 * mm], repeatRows=1)
    checklist_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#173B70")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DCE3EF")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(checklist_table)
    story.append(Paragraph("5. Scoring Business Rules", section_style))
    for rule_name, rule_description in readiness["business_rules"].items():
        story.append(Paragraph(f"<b>{safe_text(rule_name.replace('_', ' ').title())}:</b> {safe_text(rule_description)}", small_style))
        story.append(Spacer(1, 4))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Important:</b> This report reflects the readiness calculation available at the time of generation.", small_style))
    document.build(story, onFirstPage=add_page_footer, onLaterPages=add_page_footer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="tripguard-trip-{trip.id}.pdf"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})