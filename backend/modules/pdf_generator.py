# backend/modules/pdf_generator.py
# PDF generation using WeasyPrint with a ReportLab fallback.
# REPORTLAB is used when WeasyPrint or its C-libraries (Pango/Cairo) are missing.

import io
import base64
import logging
import functools
from datetime import date, datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

from modules.event_calendar import MacroEvent, get_event_by_id, load_all_events
from modules.market_snapshot import get_all_snapshots
from modules.reaction import build_reaction_points, compute_regression
from modules.event_study import compute_event_study

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=1)
def _load_all_events_cached() -> list[MacroEvent]:
    """Cache all events in memory for the process lifetime."""
    return load_all_events()

# ReportLab imports (fallback engine)
REPORTLAB_AVAILABLE = False
try:
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
    REPORTLAB_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ReportLab import failed ({e}). PDF generation will require WeasyPrint.")

# Try to import WeasyPrint
WEASYPRINT_AVAILABLE = False
try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
    logger.info("WeasyPrint imported successfully. HTML-to-PDF compilation enabled.")
except (ImportError, OSError) as e:
    logger.warning(f"WeasyPrint import failed ({e}). Falling back to ReportLab for PDF generation.")

if not WEASYPRINT_AVAILABLE and not REPORTLAB_AVAILABLE:
    logger.error("Neither WeasyPrint nor ReportLab is available. PDF generation will fail.")

# Matplotlib dark theme configuration
CHART_STYLE = {
    'figure.facecolor': '#1a1a1a',
    'axes.facecolor': '#242424',
    'axes.edgecolor': '#3a3a3a',
    'text.color': '#e5e7eb',
    'axes.labelcolor': '#e5e7eb',
    'xtick.color': '#9ca3af',
    'ytick.color': '#9ca3af',
    'grid.color': '#2a2a2a',
    'lines.color': '#f59e0b',
}
plt.rcParams.update(CHART_STYLE)

# --------------------------------------------------------------------------- #
# Matplotlib Helpers
# --------------------------------------------------------------------------- #

def chart_to_base64(fig: plt.Figure) -> str:
    """Convert matplotlib figure to base64 PNG string for HTML embedding."""
    buf = io.BytesIO()
    try:
        fig.savefig(buf, format='png', dpi=120, bbox_inches='tight',
                    facecolor='#1a1a1a', edgecolor='none')
        buf.seek(0)
        img_bytes = buf.read()
        return base64.b64encode(img_bytes).decode('utf-8')
    finally:
        plt.close(fig)

def chart_to_bytes(fig: plt.Figure) -> io.BytesIO:
    """Convert matplotlib figure to BytesIO buffer for ReportLab embedding."""
    buf = io.BytesIO()
    try:
        fig.savefig(buf, format='png', dpi=120, bbox_inches='tight',
                    facecolor='#1a1a1a', edgecolor='none')
        buf.seek(0)
        return buf
    finally:
        plt.close(fig)

# --------------------------------------------------------------------------- #
# Matplotlib Plotting functions
# --------------------------------------------------------------------------- #

def make_event_combined_chart(snapshots: dict, assets: list[str]) -> plt.Figure:
    """Renders a 2x2 grid containing bar charts of percentage changes for NIFTY, USDINR, VIX, GSEC."""
    fig, axes = plt.subplots(2, 2, figsize=(7.5, 5.5), dpi=120, facecolor='#1a1a1a')
    axes_flat = axes.flatten()
    all_assets = ["NIFTY", "USDINR", "VIX", "GSEC"]
    windows = ["T-60", "T0", "T+30", "T+2H", "T+1D"]
    
    for idx, asset in enumerate(all_assets):
        ax = axes_flat[idx]
        ax.set_facecolor('#242424')
        
        if asset not in assets:
            ax.text(0.5, 0.5, f"{asset}\n(Excluded)", color='#737373', ha='center', va='center', fontsize=9)
            ax.axis('off')
            continue
            
        snap = snapshots.get(asset)
        if not snap:
            ax.text(0.5, 0.5, f"{asset}\nNo Data Available", color='#737373', ha='center', va='center', fontsize=9)
            ax.axis('off')
            continue
            
        values = []
        labels = []
        colors_list = []
        
        for w in windows:
            w_data = snap.get(w)
            if w_data and w_data.get("pct_change_from_T60") is not None:
                val = w_data["pct_change_from_T60"]
                values.append(val)
                labels.append(w)
                if w == "T-60":
                    colors_list.append("#737373")
                elif val > 0:
                    colors_list.append("#10b981")
                else:
                    colors_list.append("#ef4444")
            else:
                values.append(0.0)
                labels.append(w)
                colors_list.append("#3f3f46")
                
        ax.bar(labels, values, color=colors_list, edgecolor='#3a3a3a', width=0.5)
        ax.set_title(f"{asset} Reaction (%)", color='#e5e7eb', fontsize=8, fontweight='bold')
        ax.grid(axis='y', linestyle='--', color='#2a2a2a')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#3a3a3a')
        ax.spines['bottom'].set_color('#3a3a3a')
        ax.tick_params(colors='#9ca3af', labelsize=6)
        
        for i, v in enumerate(values):
            w_data = snap.get(labels[i])
            if v == 0.0 and (not w_data or w_data.get("pct_change_from_T60") is None):
                continue
            va = 'bottom' if v >= 0 else 'top'
            offset = 0.08 if v >= 0 else -0.08
            ax.text(i, v + offset, f"{v:+.2f}%", ha='center', va=va, color='#e5e7eb', fontsize=5.5, fontfamily='monospace')
            
    plt.tight_layout()
    return fig

def make_scatter_chart(points: list, regression: dict, asset: str) -> plt.Figure:
    """Renders a scatter plot showing event surprises vs market reactions."""
    fig, ax = plt.subplots(figsize=(5, 3.5), dpi=120)
    fig.patch.set_facecolor('#1a1a1a')
    ax.set_facecolor('#242424')
    
    ax.set_title(f"{asset} Reaction vs Surprise Score", color='#e5e7eb', fontsize=10, fontweight='bold')
    ax.set_xlabel("Surprise Score", color='#9ca3af', fontsize=8)
    ax.set_ylabel("Reaction (%) (T+2H vs T-60)", color='#9ca3af', fontsize=8)
    
    if not points:
        ax.text(0.5, 0.5, "No Data Available", color='#737373', ha='center', va='center')
        ax.axis('off')
        return fig
        
    x = [p['surprise_score'] for p in points]
    y = [p['reaction_pct'] for p in points]
    
    ax.scatter(x, y, color='#f59e0b', alpha=0.7, edgecolors='#1a1a1a', s=35, label='Events')
    
    slope = regression.get("slope", 0.0)
    intercept = regression.get("intercept", 0.0)
    r_sq = regression.get("r_squared", 0.0)
    
    if slope != 0.0 or intercept != 0.0:
        x_min, x_max = min(x), max(x)
        x_line = np.linspace(x_min, x_max, 100)
        y_line = slope * x_line + intercept
        ax.plot(x_line, y_line, color='#ef4444', linestyle='--', linewidth=1.5,
                label=f'Fit (R²={r_sq:.2f})')
                
    ax.grid(True, linestyle='--', color='#2a2a2a')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#3a3a3a')
    ax.spines['bottom'].set_color('#3a3a3a')
    ax.tick_params(colors='#9ca3af', labelsize=8)
    ax.legend(facecolor='#1a1a1a', edgecolor='#3a3a3a', labelcolor='#e5e7eb', fontsize=8)
    
    plt.tight_layout()
    return fig

def make_study_chart(paths: list) -> plt.Figure:
    """Renders a line chart for hike/cut/hold decision paths with confidence bands."""
    fig, ax = plt.subplots(figsize=(5.8, 3.6), dpi=120)
    fig.patch.set_facecolor('#1a1a1a')
    ax.set_facecolor('#242424')
    
    ax.set_title("RBI MPC Event Study - Average Price Path", color='#e5e7eb', fontsize=10, fontweight='bold')
    ax.set_xlabel("Trading Days Relative to Decision (T0)", color='#9ca3af', fontsize=8)
    ax.set_ylabel("Indexed Close Price (T0 = 100)", color='#9ca3af', fontsize=8)
    
    days = [-2, -1, 0, 1, 2]
    ax.set_xticks(days)
    ax.set_xticklabels([f"T{d:+.0f}" if d != 0 else "T0" for d in days])
    
    ax.axvline(x=0, color='#f59e0b', linestyle=':', linewidth=1.5, label='Event Day')
    
    has_data = False
    for path in paths:
        if isinstance(path, dict):
            dec_type = path.get("decision_type")
            mean_indexed = path.get("mean_indexed")
            upper_band = path.get("upper_band")
            lower_band = path.get("lower_band")
            count = path.get("event_count", 0)
        else:
            dec_type = path.decision_type
            mean_indexed = path.mean_indexed
            upper_band = path.upper_band
            lower_band = path.lower_band
            count = path.event_count
            
        if not mean_indexed or len(mean_indexed) != 5:
            continue
            
        has_data = True
        
        if dec_type == "hike":
            color = '#f59e0b'
            label = f"Hike (N={count})"
        elif dec_type == "cut":
            color = '#ef4444'
            label = f"Cut (N={count})"
        else:
            color = '#737373'
            label = f"Hold (N={count})"
            
        ax.plot(days, mean_indexed, color=color, linewidth=2, marker='o', label=label)
        
        if upper_band and lower_band and len(upper_band) == 5 and len(lower_band) == 5:
            ax.fill_between(days, lower_band, upper_band, color=color, alpha=0.06)
            
    if not has_data:
        ax.text(0.5, 0.5, "No Event Study Data Available", color='#737373', ha='center', va='center')
        ax.axis('off')
        return fig
        
    ax.grid(True, linestyle='--', color='#2a2a2a')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#3a3a3a')
    ax.spines['bottom'].set_color('#3a3a3a')
    ax.tick_params(colors='#9ca3af', labelsize=8)
    ax.legend(facecolor='#1a1a1a', edgecolor='#3a3a3a', labelcolor='#e5e7eb', fontsize=8, loc='best')
    
    plt.tight_layout()
    return fig

# --------------------------------------------------------------------------- #
# WeasyPrint PDF Generation Engine
# --------------------------------------------------------------------------- #

def render_html_template(
    events: list[MacroEvent],
    snapshots_data: dict,
    scatter_data: dict,
    study_data: dict,
    options: dict
) -> str:
    """Builds and renders the HTML string with embedded matplotlib charts in base64."""
    from jinja2 import Environment
    
    # 1. Generate Cover & Summary
    cover_date = date.today().strftime("%B %d, %Y")
    event_count = len(events)
    assets_list = ", ".join(options.get("assets", []))
    
    # 2. Render chart objects to base64
    event_charts_b64 = {}
    for event in events:
        try:
            fig = make_event_combined_chart(snapshots_data.get(event.id, {}), options.get("assets", []))
            event_charts_b64[event.id] = chart_to_base64(fig)
        except Exception as e:
            logger.error(f"Chart generation failed for event {event.id}: {e}")
            event_charts_b64[event.id] = ""
        
    scatter_charts_b64 = {}
    if options.get("include_scatter"):
        for asset in options.get("assets", []):
            try:
                sc_data = scatter_data.get(asset, {})
                fig = make_scatter_chart(sc_data.get("points", []), sc_data.get("regression", {}), asset)
                scatter_charts_b64[asset] = chart_to_base64(fig)
            except Exception as e:
                logger.error(f"Scatter chart generation failed for {asset}: {e}")
                scatter_charts_b64[asset] = ""
            
    study_charts_b64 = {}
    if options.get("include_study"):
        for asset in ["NIFTY", "USDINR"]:
            if asset in options.get("assets", []):
                try:
                    fig = make_study_chart(study_data.get(asset, []))
                    study_charts_b64[asset] = chart_to_base64(fig)
                except Exception as e:
                    logger.error(f"Study chart generation failed for {asset}: {e}")
                    study_charts_b64[asset] = ""
                
    html_raw = """
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      @page {
        size: A4;
        margin: 15mm;
        @bottom-right {
          content: counter(page);
          color: #737373;
          font-size: 8px;
          font-family: monospace;
        }
      }
      body {
        background-color: #1a1a1a;
        color: #e5e7eb;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3 {
        color: #f59e0b;
        font-family: Georgia, serif;
      }
      .page-break {
        page-break-before: always;
      }
      
      /* Cover Page */
      .cover-page {
        text-align: center;
        height: 250mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-top: 50mm;
      }
      .cover-title {
        font-size: 32px;
        margin-bottom: 5px;
        color: #f59e0b;
        font-weight: bold;
      }
      .cover-subtitle {
        font-size: 14px;
        color: #9ca3af;
        margin-bottom: 50mm;
        letter-spacing: 2px;
      }
      .cover-meta {
        font-size: 11px;
        color: #737373;
        line-height: 1.8;
        font-family: monospace;
      }
      
      /* Summary Page */
      .section-title {
        border-bottom: 1px solid #3a3a3a;
        padding-bottom: 8px;
        margin-bottom: 20px;
        font-size: 20px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        background-color: #222222;
      }
      th, td {
        padding: 8px 10px;
        border: 1px solid #3a3a3a;
        text-align: left;
        font-size: 10px;
      }
      th {
        background-color: #2a2a2a;
        color: #f59e0b;
        font-weight: bold;
        font-family: Georgia, serif;
      }
      td.mono {
        font-family: monospace;
      }
      
      /* Dynamic cell coloring */
      .pos-value {
        color: #10b981;
        background-color: rgba(16, 185, 129, 0.05);
      }
      .neg-value {
        color: #ef4444;
        background-color: rgba(239, 68, 68, 0.05);
      }
      
      /* Event Page */
      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 1px solid #3a3a3a;
        margin-bottom: 15px;
        padding-bottom: 5px;
      }
      .event-title {
        font-size: 18px;
        margin: 0;
      }
      .event-date {
        font-family: monospace;
        font-size: 12px;
        color: #9ca3af;
      }
      .event-notes {
        font-size: 10px;
        color: #9ca3af;
        font-style: italic;
        margin-bottom: 15px;
      }
      
      .chart-box {
        text-align: center;
        margin-top: 15px;
      }
      .chart-img {
        width: 95%;
        max-width: 500px;
        border: 1px solid #2a2a2a;
        border-radius: 4px;
      }
    </style>
    </head>
    <body>
      
      <!-- 1. COVER PAGE -->
      <div class="cover-page">
        <div class="cover-title">MACRO EVENT IMPACT REPORT</div>
        <div class="cover-subtitle">INDIA EDITION</div>
        <div style="height: 30mm;"></div>
        <div class="cover-meta">
          <strong>DATE GENERATED:</strong> {{ cover_date }}<br>
          <strong>SELECTED EVENTS:</strong> {{ event_count }} events included<br>
          <strong>TARGET ASSET CLASSES:</strong> {{ assets_list }}<br>
          <strong>DATA SOURCES:</strong> yfinance · Finnhub · data.gov.in
        </div>
      </div>
      
      <!-- 2. SUMMARY TABLE -->
      <div class="page-break">
        <h2 class="section-title">Selected Events Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Event ID</th>
              <th>Type</th>
              <th>Outcome</th>
              <th>Actual</th>
              <th>Consensus</th>
              <th>Surprise Score</th>
            </tr>
          </thead>
          <tbody>
            {% for e in events %}
            <tr>
              <td class="mono">{{ e.date }}</td>
              <td class="mono"><strong>{{ e.id }}</strong></td>
              <td>{{ e.event_type }}</td>
              <td>{{ e.outcome or '--' }}</td>
              <td class="mono">{{ e.actual if e.actual is not None else '--' }}</td>
              <td class="mono">{{ e.consensus if e.consensus is not None else '--' }}</td>
              <td class="mono {% if e.surprise_score and e.surprise_score > 0 %}pos-value{% elif e.surprise_score and e.surprise_score < 0 %}neg-value{% endif %}">
                {{ e.surprise_score|round(2) if e.surprise_score is not None else '--' }}
              </td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      </div>
      
      <!-- 3. PER EVENT DETAIL PAGES -->
      {% for e in events %}
      <div class="page-break">
        <div class="event-header">
          <h2 class="event-title">{{ e.id }}</h2>
          <span class="event-date">{{ e.date }} &nbsp; [{{ e.event_type }}]</span>
        </div>
        
        {% if e.notes %}
        <div class="event-notes">Notes: "{{ e.notes }}"</div>
        {% endif %}
        
        <!-- Snapshot Table -->
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>T-60 (Base)</th>
              <th>T0 (Ann.)</th>
              <th>T+30 Min</th>
              <th>T+2 Hour</th>
              <th>T+1 Day</th>
            </tr>
          </thead>
          <tbody>
            {% for asset in options.assets %}
            {% set snap = snapshots_data[e.id][asset] %}
            <tr>
              <td><strong>{{ asset }}</strong></td>
              {% for win in ["T-60", "T0", "T+30", "T+2H", "T+1D"] %}
              {% set win_data = snap[win] if snap else None %}
              <td class="mono {% if win_data and win_data.pct_change_from_T60 and win_data.pct_change_from_T60 > 0.001 %}pos-value{% elif win_data and win_data.pct_change_from_T60 and win_data.pct_change_from_T60 < -0.001 %}neg-value{% endif %}">
                {% if win_data and win_data.pct_change_from_T60 is not None %}
                  {{ win_data.pct_change_from_T60|round(2) }}%
                  <div style="font-size: 7px; color: #737373;">{{ win_data.price }}</div>
                {% else %}
                  --
                {% endif %}
              </td>
              {% endfor %}
            </tr>
            {% endfor %}
          </tbody>
        </table>
        
        <!-- Grid chart -->
        {% if event_charts.get(e.id) %}
        <div class="chart-box">
          <img class="chart-img" src="data:image/png;base64,{{ event_charts[e.id] }}">
        </div>
        {% else %}
        <div class="chart-box" style="color: #737373; font-size: 10px; padding: 20px;">
          Chart generation failed for this event.
        </div>
        {% endif %}
      </div>
      {% endfor %}
      
      <!-- 4. HISTORICAL SCATTER PAGES -->
      {% if options.include_scatter %}
      {% for asset in options.assets %}
      {% if scatter_charts[asset] %}
      <div class="page-break">
        <h2 class="section-title">Historical Scatter Plot: {{ asset }}</h2>
        <p style="font-size: 10px; color: #9ca3af; margin-bottom: 20px;">
          Mapping historical surprise scores against immediate reaction (T+2H vs T-60 baseline).
        </p>
        <div class="chart-box">
          <img class="chart-img" style="max-width: 450px;" src="data:image/png;base64,{{ scatter_charts[asset] }}">
        </div>
      </div>
      {% endif %}
      {% endfor %}
      {% endif %}
      
      <!-- 5. EVENT STUDY PAGE -->
      {% if options.include_study %}
      {% for asset in ["NIFTY", "USDINR"] %}
      {% if asset in options.assets and study_charts[asset] %}
      <div class="page-break">
        <h2 class="section-title">Event Study Average Path: {{ asset }}</h2>
        <p style="font-size: 10px; color: #9ca3af; margin-bottom: 20px;">
          Average indexed price action (T0=100) surrounding historical MPC decisions (T-2 to T+2 trading days).
        </p>
        <div class="chart-box">
          <img class="chart-img" style="max-width: 500px;" src="data:image/png;base64,{{ study_charts[asset] }}">
        </div>
      </div>
      {% endif %}
      {% endfor %}
      {% endif %}
      
    </body>
    </html>
    """
    
    env = Environment(autoescape=True)
    t = env.from_string(html_raw)
    return t.render(
        cover_date=cover_date,
        event_count=event_count,
        assets_list=assets_list,
        events=events,
        snapshots_data=snapshots_data,
        event_charts=event_charts_b64,
        scatter_charts=scatter_charts_b64,
        study_charts=study_charts_b64,
        options=options
    )

def generate_pdf_weasyprint(html_str: str) -> bytes:
    """Uses WeasyPrint to compile the HTML+CSS template to PDF bytes."""
    html = weasyprint.HTML(string=html_str)
    return html.write_pdf()

# --------------------------------------------------------------------------- #
# ReportLab PDF Generation Engine (Fallback)
# --------------------------------------------------------------------------- #

def generate_pdf_reportlab(
    events: list[MacroEvent],
    snapshots_data: dict,
    scatter_data: dict,
    study_data: dict,
    options: dict
) -> bytes:
    """Uses ReportLab to programmatically assemble a dark-themed PDF report."""
    buffer = io.BytesIO()
    
    # 1. Setup Document Template
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    # Background callback to draw dark backdrop on every page
    def draw_dark_bg(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor('#1a1a1a'))
        canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1, stroke=0)
        canvas.restoreState()
        
    styles = getSampleStyleSheet()
    
    # Modify default styles for dark background compatibility
    styles['Normal'].textColor = colors.HexColor('#e5e7eb')
    styles['BodyText'].textColor = colors.HexColor('#e5e7eb')
    
    # Define custom styles
    title_style = ParagraphStyle(
        'RepTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=30,
        textColor=colors.HexColor('#f59e0b'),
        alignment=1, # Center
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'RepSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#9ca3af'),
        alignment=1,
        spaceAfter=50
    )
    
    meta_style = ParagraphStyle(
        'RepMeta',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=16,
        textColor=colors.HexColor('#737373'),
        alignment=1
    )
    
    h1_style = ParagraphStyle(
        'RepH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#f59e0b'),
        spaceBefore=15,
        spaceAfter=12,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'RepBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#e5e7eb')
    )
    
    note_style = ParagraphStyle(
        'RepNote',
        parent=styles['BodyText'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#9ca3af')
    )
    
    story = []
    open_buffers: list[io.BytesIO] = []
    
    # 2. Cover Page
    story.append(Spacer(1, 150))
    story.append(Paragraph("MACRO EVENT IMPACT REPORT", title_style))
    story.append(Paragraph("INDIA EDITION (REPORTLAB FALLBACK)", subtitle_style))
    story.append(Spacer(1, 80))
    
    assets_str = ", ".join(options.get("assets", []))
    meta_text = (
        f"<b>DATE GENERATED:</b> {date.today().strftime('%Y-%m-%d')}<br/>"
        f"<b>SELECTED EVENTS:</b> {len(events)} events included<br/>"
        f"<b>TARGET ASSET CLASSES:</b> {assets_str}<br/>"
        f"<b>DATA SOURCES:</b> yfinance · Finnhub · data.gov.in"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(PageBreak())
    
    # 3. Events Summary Table Page
    story.append(Paragraph("Selected Events Summary", h1_style))
    story.append(Spacer(1, 10))
    
    summary_data = [["Date", "Event ID", "Type", "Outcome", "Actual", "Consensus", "Surprise"]]
    for e in events:
        act = f"{e.actual:.2f}%" if e.actual is not None else "--"
        con = f"{e.consensus:.2f}%" if e.consensus is not None else "--"
        sur = f"{e.surprise_score:+.2f}" if e.surprise_score is not None else "--"
        summary_data.append([
            e.date.isoformat(),
            e.id,
            e.event_type,
            e.outcome or "--",
            act,
            con,
            sur
        ])
        
    sum_table = Table(summary_data, colWidths=[70, 100, 50, 80, 60, 60, 60])
    sum_table_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#f59e0b')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#3a3a3a')),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]
    
    for row_idx, e in enumerate(events, start=1):
        if e.surprise_score is not None:
            if e.surprise_score > 0.01:
                sum_table_style.append(('BACKGROUND', (6, row_idx), (6, row_idx), colors.HexColor('#1b3d2b')))
                sum_table_style.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), colors.HexColor('#10b981')))
            elif e.surprise_score < -0.01:
                sum_table_style.append(('BACKGROUND', (6, row_idx), (6, row_idx), colors.HexColor('#4c1d1d')))
                sum_table_style.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), colors.HexColor('#ef4444')))
                
    sum_table.setStyle(TableStyle(sum_table_style))
    story.append(sum_table)
    story.append(PageBreak())
    
    # 4. Per Event Detail Pages
    for e in events:
        event_story = []
        event_story.append(Paragraph(f"Event Analysis: {e.id}", h1_style))
        event_story.append(Paragraph(f"<b>Date:</b> {e.date.isoformat()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Type:</b> {e.event_type} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Outcome:</b> {e.outcome or '--'}", body_style))
        
        if e.notes:
            event_story.append(Spacer(1, 4))
            event_story.append(Paragraph(f"<b>Notes:</b> \"{e.notes}\"", note_style))
            
        event_story.append(Spacer(1, 10))
        
        # Reaction Table
        reaction_headers = ["Asset", "T-60", "T0", "T+30", "T+2H", "T+1D"]
        reaction_rows = [reaction_headers]
        
        for asset in options.get("assets", []):
            snap = snapshots_data.get(e.id, {}).get(asset)
            row = [asset]
            for win in ["T-60", "T0", "T+30", "T+2H", "T+1D"]:
                w_data = snap.get(win) if snap else None
                if w_data and w_data.get("pct_change_from_T60") is not None:
                    row.append(f"{w_data['pct_change_from_T60']:+.2f}%")
                else:
                    row.append("--")
            reaction_rows.append(row)
            
        react_table = Table(reaction_rows, colWidths=[90, 75, 75, 75, 75, 75])
        react_table_style = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2a2a2a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#f59e0b')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#3a3a3a')),
            ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]
        
        for row_idx, asset in enumerate(options.get("assets", []), start=1):
            snap = snapshots_data.get(e.id, {}).get(asset)
            if snap:
                for col_idx, win in enumerate(["T-60", "T0", "T+30", "T+2H", "T+1D"], start=1):
                    w_data = snap.get(win)
                    if w_data and w_data.get("pct_change_from_T60") is not None:
                        val = w_data["pct_change_from_T60"]
                        if win == "T-60":
                            react_table_style.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#2d2d2d')))
                        elif val > 0.001:
                            react_table_style.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#1b3d2b')))
                            react_table_style.append(('TEXTCOLOR', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#10b981')))
                        elif val < -0.001:
                            react_table_style.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#4c1d1d')))
                            react_table_style.append(('TEXTCOLOR', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#ef4444')))
                            
        react_table.setStyle(TableStyle(react_table_style))
        event_story.append(react_table)
        event_story.append(Spacer(1, 15))
        
        # 2x2 Matplotlib grid image
        fig = make_event_combined_chart(snapshots_data.get(e.id, {}), options.get("assets", []))
        img_buf = chart_to_bytes(fig)
        react_img = Image(img_buf, width=420, height=308)
        open_buffers.append(img_buf)
        event_story.append(react_img)
        
        story.append(KeepTogether(event_story))
        story.append(PageBreak())
        
    # 5. Historical Scatter Pages
    if options.get("include_scatter"):
        for asset in options.get("assets", []):
            sc_data = scatter_data.get(asset, {})
            points = sc_data.get("points", [])
            regression = sc_data.get("regression", {})
            
            if points:
                scatter_story = []
                scatter_story.append(Paragraph(f"Historical Scatter Analysis: {asset}", h1_style))
                scatter_story.append(Paragraph(f"Regression plot tracking market surprise vs immediate reaction window (T+2H vs T-60 baseline) over all historical events.", body_style))
                scatter_story.append(Spacer(1, 20))
                
                fig = make_scatter_chart(points, regression, asset)
                img_buf = chart_to_bytes(fig)
                scatter_img = Image(img_buf, width=380, height=266)
                open_buffers.append(img_buf)
                scatter_story.append(scatter_img)
                
                story.append(KeepTogether(scatter_story))
                story.append(PageBreak())
                
    # 6. Event Study Pages
    if options.get("include_study"):
        for asset in ["NIFTY", "USDINR"]:
            if asset in options.get("assets", []):
                paths_list = study_data.get(asset, [])
                if paths_list:
                    study_story = []
                    study_story.append(Paragraph(f"Event Study Average Path: {asset}", h1_style))
                    study_story.append(Paragraph("Indexed price action overlay (T0 = 100) from T-2 to T+2 trading days surrounding RBI MPC decisions.", body_style))
                    study_story.append(Spacer(1, 20))
                    
                    fig = make_study_chart(paths_list)
                    img_buf = chart_to_bytes(fig)
                    study_img = Image(img_buf, width=400, height=248)
                    open_buffers.append(img_buf)
                    study_story.append(study_img)
                    
                    story.append(KeepTogether(study_story))
                    story.append(PageBreak())
                    
    # Build Document
    try:
        doc.build(story, onFirstPage=draw_dark_bg, onLaterPages=draw_dark_bg)
        pdf_bytes = buffer.getvalue()
    finally:
        for buf in open_buffers:
            buf.close()
        buffer.close()
    return pdf_bytes

# --------------------------------------------------------------------------- #
# Full PDF Generation Pipeline Orchestrator
# --------------------------------------------------------------------------- #

def generate_pdf(
    event_ids: list[str],
    assets: list[str],
    include_scatter: bool,
    include_study: bool,
) -> bytes:
    """
    Main orchestrator that gathers event snapshots, scatter plot data, and event
    study paths, renders the required charts, compiles the final PDF, and
    returns the compiled PDF as binary bytes.
    """
    logger.info(f"Starting PDF generation pipeline for {len(event_ids)} events...")
    
    # 1. Fetch Events & Snapshots — single load_all_events() call
    from modules.market_snapshot import get_snapshot_with_cache
    all_events = _load_all_events_cached()
    event_map = {e.id: e for e in all_events}
    
    events: list[MacroEvent] = []
    snapshots_data = {}
    skipped_ids: list[str] = []
    
    for eid in event_ids:
        event = event_map.get(eid)
        if not event:
            logger.warning(f"Event {eid} not found during report generation. Skipping.")
            skipped_ids.append(eid)
            continue
            
        events.append(event)
        
        # Load snapshots for all 4 assets (or requested assets)
        snapshots_data[eid] = {}
        for asset in ["NIFTY", "USDINR", "VIX", "GSEC"]:
            try:
                # Force cache read or yfinance fetch
                snap = get_snapshot_with_cache(event, asset)
                if snap:
                    snapshots_data[eid][asset] = snap
                else:
                    snapshots_data[eid][asset] = None
            except Exception as e:
                logger.error(f"Error fetching snapshot for event {eid}, asset {asset}: {e}")
                snapshots_data[eid][asset] = None
                
    if skipped_ids:
        logger.warning(f"Skipped {len(skipped_ids)} event(s) not found in database: {skipped_ids}")
                
    # Sort events by date descending to match timeline
    events.sort(key=lambda e: e.date, reverse=True)
    
    # 2. Gathers Scatter data if requested
    scatter_data = {}
    if include_scatter:
        for asset in assets:
            try:
                # Use only CPI/IIP events from the user-selected set
                filtered_events = [e for e in events if e.event_type != "MPC"]
                points = build_reaction_points(filtered_events, asset, "T+2H")
                regression = compute_regression(points)
                
                # Convert ReactionPoint list to simple serializable dicts
                scatter_data[asset] = {
                    "points": [p.to_dict() for p in points],
                    "regression": regression
                }
            except Exception as e:
                logger.error(f"Error gathering scatter data for {asset}: {e}")
                scatter_data[asset] = {"points": [], "regression": {}}
                
    # 3. Gather Event Study data if requested
    study_data = {}
    if include_study:
        for asset in ["NIFTY", "USDINR"]:
            if asset in assets:
                try:
                    # Use only MPC events from the user-selected set
                    selected_mpc = [e for e in events if e.event_type == "MPC"]
                    paths = compute_event_study(selected_mpc, asset)
                    study_data[asset] = paths
                except Exception as e:
                    logger.error(f"Error gathering study paths for {asset}: {e}")
                    study_data[asset] = []
                    
    options = {
        "assets": assets,
        "include_scatter": include_scatter,
        "include_study": include_study
    }
    
    # 4. Generate PDF using WeasyPrint (if available) or ReportLab
    if WEASYPRINT_AVAILABLE:
        try:
            logger.info("Compiling PDF report using WeasyPrint...")
            html_str = render_html_template(events, snapshots_data, scatter_data, study_data, options)
            return generate_pdf_weasyprint(html_str)
        except Exception as e:
            logger.error(f"WeasyPrint PDF compilation failed: {e}", exc_info=True)
            # Fall through to ReportLab
            
    if REPORTLAB_AVAILABLE:
        try:
            logger.info("Compiling PDF report using ReportLab...")
            return generate_pdf_reportlab(events, snapshots_data, scatter_data, study_data, options)
        except Exception as e:
            logger.error(f"ReportLab PDF compilation also failed: {e}", exc_info=True)
            raise RuntimeError(f"PDF generation failed with both engines: {e}") from e
    else:
        raise RuntimeError(
            "No PDF engine available. Install weasyprint or reportlab: "
            "pip install weasyprint reportlab"
        )
