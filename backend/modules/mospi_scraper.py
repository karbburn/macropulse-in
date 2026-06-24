# backend/modules/mospi_scraper.py
"""
MOSPI (Ministry of Statistics and Programme Implementation) scraper.
Scrapes CPI and IIP release dates and actuals from MOSPI press releases.

No API key required.
Primary URL: https://mospi.gov.in/web/mospi/press-releases

Strategy:
- MOSPI publishes press releases as PDFs + HTML summaries
- We scrape the HTML summary pages for release dates and headline numbers
- Fall back to RBI DBIE actuals if scraping fails (always)

Rate limit: sleep(2) between requests — government servers are slow.
"""

import requests
import time
import re
from datetime import date, datetime
from typing import Optional

MOSPI_BASE = "https://mospi.gov.in"
MOSPI_PRESS = "https://mospi.gov.in/web/mospi/press-releases"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _post(url: str, json: dict, timeout: int = 15) -> Optional[requests.Response]:
    """
    Safe POST with timeout and error handling.
    Returns None on any error — never crashes.
    """
    try:
        time.sleep(2)  # Always sleep before government server requests
        res = requests.post(url, json=json, headers=HEADERS, timeout=timeout)
        res.raise_for_status()
        return res
    except Exception as e:
        print(f"[mospi_scraper] POST failed: {url} — {e}")
        return None


MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
}


def parse_reference_month(text: str) -> Optional[str]:
    """
    Extract reference month like '(May 2026)' or 'April 2026' and convert to YYYY-MM-01 format.
    """
    text_lower = text.lower()
    pattern = r'(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})'
    match = re.search(pattern, text_lower)
    if match:
        m_name = match.group(1)
        year = int(match.group(2))
        month = MONTH_MAP[m_name]
        return f"{year:04d}-{month:02d}-01"
    return None


def scrape_latest_cpi_release() -> dict:
    """
    Scrape MOSPI for the most recent CPI press release.
    
    Returns:
    {
        "release_date": "2024-06-12",    # date MOSPI published the data
        "reference_month": "2024-05-01", # month the CPI refers to
        "cpi_yoy": 4.88,                 # headline CPI YoY %
        "source": "mospi"
    }
    
    Returns dict with all None values if scraping fails.
    """
    result = {
        "release_date": None,
        "reference_month": None,
        "cpi_yoy": None,
        "source": "mospi"
    }
    
    try:
        # 1. Fetch KPI value and reference month from MOSPI Product API
        kpi_url = "https://www.mospi.gov.in/api/product/get-product-data"
        kpi_res = _post(kpi_url, json={"product_id": "9", "lang": "en"})
        if kpi_res:
            data = kpi_res.json()
            kpis = data.get("data", {}).get("kpiData", [])
            for kpi in kpis:
                name = kpi.get("kpi_name", "")
                val = kpi.get("kpi_value", "")
                
                # Clean HTML tags and entities
                clean_name = re.sub(r'<[^>]*>', '', name).replace('&nbsp;', ' ').strip()
                if "inflation" in clean_name.lower() and "cpi" in clean_name.lower():
                    # Extract YoY percentage
                    pct_match = re.search(r'(\d+(?:\.\d+)?)', val)
                    if pct_match:
                        result["cpi_yoy"] = float(pct_match.group(1))
                        
                    # Extract reference month
                    ref_month = parse_reference_month(clean_name)
                    if ref_month:
                        result["reference_month"] = ref_month

        # 2. Fetch Release Date from latest releases list
        releases_url = "https://www.mospi.gov.in/api/latest-release/get-web-latest-release-list"
        rel_res = _post(releases_url, json={
            "page_no": 1,
            "page_size": 20,
            "search_term": "",
            "sort_field": "published_date",
            "sort_order": "DESC",
            "lang": "en"
        })
        if rel_res:
            releases = rel_res.json().get("data", [])
            for rel in releases:
                title = rel.get("title", "")
                pub_date = rel.get("published_year", "")
                title_lower = title.lower()
                if ("cpi" in title_lower or "consumer price" in title_lower) and ("press" in title_lower or "release" in title_lower or "note" in title_lower):
                    result["release_date"] = pub_date
                    break
                    
    except Exception as e:
        print(f"[mospi_scraper] CPI scrape failed: {e}")
    
    return result


def scrape_latest_iip_release() -> dict:
    """
    Scrape MOSPI for the most recent IIP press release.
    
    Returns same structure as scrape_latest_cpi_release() but for IIP.
    """
    result = {
        "release_date": None,
        "reference_month": None,
        "iip_yoy": None,
        "source": "mospi"
    }
    
    try:
        # 1. Fetch KPI value and reference month from MOSPI Product API
        kpi_url = "https://www.mospi.gov.in/api/product/get-product-data"
        kpi_res = _post(kpi_url, json={"product_id": "54", "lang": "en"})
        if kpi_res:
            data = kpi_res.json()
            kpis = data.get("data", {}).get("kpiData", [])
            for kpi in kpis:
                name = kpi.get("kpi_name", "")
                val = kpi.get("kpi_value", "")
                
                # Clean HTML tags and entities
                clean_name = re.sub(r'<[^>]*>', '', name).replace('&nbsp;', ' ').strip()
                if "iip" in clean_name.lower() or "industrial production" in clean_name.lower():
                    # Extract YoY percentage
                    pct_match = re.search(r'(\d+(?:\.\d+)?)', val)
                    if pct_match:
                        result["iip_yoy"] = float(pct_match.group(1))
                        
                    # Extract reference month
                    ref_month = parse_reference_month(clean_name)
                    if ref_month:
                        result["reference_month"] = ref_month

        # 2. Fetch Release Date from latest releases list
        releases_url = "https://www.mospi.gov.in/api/latest-release/get-web-latest-release-list"
        rel_res = _post(releases_url, json={
            "page_no": 1,
            "page_size": 20,
            "search_term": "",
            "sort_field": "published_date",
            "sort_order": "DESC",
            "lang": "en"
        })
        if rel_res:
            releases = rel_res.json().get("data", [])
            for rel in releases:
                title = rel.get("title", "")
                pub_date = rel.get("published_year", "")
                title_lower = title.lower()
                if ("iip" in title_lower or "industrial production" in title_lower) and ("press" in title_lower or "release" in title_lower or "note" in title_lower or "estimate" in title_lower):
                    result["release_date"] = pub_date
                    break
                    
    except Exception as e:
        print(f"[mospi_scraper] IIP scrape failed: {e}")
    
    return result


def get_cpi_iip_with_fallback(rbi_dbie_module) -> dict:
    """
    Main function called by nightly precompute.
    
    Strategy:
    1. Try MOSPI scraper for latest release date + actual
    2. If MOSPI fails or returns None values, fall back to RBI DBIE CSV
    3. Always return something — never block the nightly job
    
    Returns:
    {
        "cpi": { "actual": 4.88, "release_date": "2024-06-12", "source": "mospi"|"rbi_dbie" },
        "iip": { "actual": 5.9,  "release_date": "2024-06-12", "source": "mospi"|"rbi_dbie" }
    }
    """
    # Try MOSPI first
    cpi_mospi = scrape_latest_cpi_release()
    iip_mospi = scrape_latest_iip_release()
    
    # CPI: use MOSPI if got actual, else fall back to RBI DBIE
    if cpi_mospi["cpi_yoy"] is not None:
        release = cpi_mospi["release_date"]
        if not release:
            release = cpi_mospi["reference_month"]
            print("[mospi_scraper] WARNING: No release_date from MOSPI CPI, using reference_month as fallback")
        cpi_result = {
            "actual": cpi_mospi["cpi_yoy"],
            "release_date": release,
            "source": "mospi"
        }
        print(f"[mospi_scraper] CPI from MOSPI: {cpi_result['actual']}%")
    else:
        dbie_cpi = rbi_dbie_module.get_latest_cpi()
        cpi_result = {
            "actual": dbie_cpi["actual"],
            "release_date": dbie_cpi["date"],
            "source": "rbi_dbie"
        }
        print(f"[mospi_scraper] CPI fallback to RBI DBIE: {cpi_result['actual']}%")
    
    # IIP: same pattern
    if iip_mospi["iip_yoy"] is not None:
        release = iip_mospi["release_date"]
        if not release:
            release = iip_mospi["reference_month"]
            print("[mospi_scraper] WARNING: No release_date from MOSPI IIP, using reference_month as fallback")
        iip_result = {
            "actual": iip_mospi["iip_yoy"],
            "release_date": release,
            "source": "mospi"
        }
        print(f"[mospi_scraper] IIP from MOSPI: {iip_result['actual']}%")
    else:
        dbie_iip = rbi_dbie_module.get_latest_iip()
        iip_result = {
            "actual": dbie_iip["actual"],
            "release_date": dbie_iip["date"],
            "source": "rbi_dbie"
        }
        print(f"[mospi_scraper] IIP fallback to RBI DBIE: {iip_result['actual']}%")
    
    return {"cpi": cpi_result, "iip": iip_result}
