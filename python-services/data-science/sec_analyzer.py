"""
SEC Filing Analyzer — Proprietary Data Pipeline

Ingests raw SEC filings from EDGAR, extracts structured data via Claude,
detects cross-filing changes, and stores a proprietary dataset that creates
an irreplicable data moat.

Components:
    1. SECFilingIngester  — Pull 8-K, 10-Q, 10-K, Form 4 from EDGAR
    2. FilingAnalyzer     — Claude-powered structured extraction
    3. FilingChangeDetector — Cross-filing comparison (guidance, risk, tone)
    4. ScheduledRunner    — 30-min market-hours polling loop

Usage:
    python sec_analyzer.py              # Run one cycle
    python sec_analyzer.py --daemon     # Run as scheduled daemon
    python sec_analyzer.py --backfill 7 # Backfill last N days
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from html.parser import HTMLParser

import anthropic
import httpx
import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PGConnection

# ─── Configuration ───────────────────────────────────────────

LOG = logging.getLogger("sec_analyzer")
LOG.setLevel(logging.INFO)
_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
))
LOG.addHandler(_handler)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
S3_BUCKET = os.environ.get("SEC_FILINGS_BUCKET", "obsidian-sec-filings")
EDGAR_USER_AGENT = os.environ.get(
    "EDGAR_USER_AGENT",
    "ObsidianMarkets/1.0 (support@obsidianmarkets.com)",
)

# SEC EDGAR rate limit: 10 requests/second
EDGAR_DELAY = 0.12  # seconds between requests

# Filing types to track
FILING_TYPES = ["8-K", "10-Q", "10-K", "4"]

# Claude model for extraction
EXTRACTION_MODEL = "claude-sonnet-4-20250514"
EXTRACTION_MAX_TOKENS = 4096

# Max filing size to send to Claude (chars) — truncate huge filings
MAX_FILING_CHARS = 80_000


# ─── Data Models ─────────────────────────────────────────────

@dataclass
class FilingMeta:
    """Metadata for a single SEC filing."""
    accession_number: str
    filing_type: str
    company_name: str
    ticker: str
    cik: str
    filed_date: str  # YYYY-MM-DD
    filing_url: str
    document_url: str
    raw_text_hash: str = ""
    raw_text_length: int = 0


@dataclass
class MaterialEvent:
    event_type: str
    summary: str
    sentiment: str  # positive | negative | neutral
    magnitude: str  # high | medium | low


@dataclass
class FinancialMetricChange:
    metric: str
    old_value: str
    new_value: str


@dataclass
class InsiderTransaction:
    name: str
    title: str
    action: str  # buy | sell
    shares: float
    price: float
    total_value: float


@dataclass
class FilingExtract:
    """Structured extraction from a single filing."""
    filing_type: str
    company: str
    ticker: str
    filed_date: str
    accession_number: str
    material_events: list[MaterialEvent] = field(default_factory=list)
    financial_metrics_changed: list[FinancialMetricChange] = field(default_factory=list)
    insider_transactions: list[InsiderTransaction] = field(default_factory=list)
    risk_factors_new: list[str] = field(default_factory=list)
    key_quotes: list[str] = field(default_factory=list)
    extraction_model: str = ""
    extraction_tokens: int = 0
    extraction_cost_cents: float = 0.0


@dataclass
class FilingChange:
    """Change detected between consecutive filings."""
    ticker: str
    change_type: str  # guidance_change | new_risk_factor | margin_change | tone_shift
    description: str
    severity: str  # high | medium | low
    current_filing_date: str
    prior_filing_date: str
    current_accession: str
    prior_accession: str


# ─── HTML Text Extraction ────────────────────────────────────

class _HTMLTextExtractor(HTMLParser):
    """Strip HTML tags and extract plain text."""

    def __init__(self):
        super().__init__()
        self._text: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs):
        if tag in ("script", "style", "head"):
            self._skip = True

    def handle_endtag(self, tag: str):
        if tag in ("script", "style", "head"):
            self._skip = False
        if tag in ("p", "div", "br", "tr", "li", "h1", "h2", "h3", "h4"):
            self._text.append("\n")

    def handle_data(self, data: str):
        if not self._skip:
            self._text.append(data)

    def get_text(self) -> str:
        raw = "".join(self._text)
        # Collapse whitespace
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()


def html_to_text(html: str) -> str:
    """Convert HTML filing content to clean plain text."""
    parser = _HTMLTextExtractor()
    try:
        parser.feed(html)
    except Exception:
        # Fallback: crude regex strip
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    return parser.get_text()


# ─── Database Layer ──────────────────────────────────────────

DB_SCHEMA = """
-- SEC Filing Extracts: Proprietary structured data from raw filings
CREATE TABLE IF NOT EXISTS sec_filing_extracts (
    id                    SERIAL PRIMARY KEY,
    accession_number      TEXT UNIQUE NOT NULL,
    filing_type           TEXT NOT NULL,
    company               TEXT NOT NULL,
    ticker                TEXT NOT NULL,
    cik                   TEXT,
    filed_date            DATE NOT NULL,
    filing_url            TEXT,
    document_url          TEXT,
    raw_text_hash         TEXT,
    raw_text_length       INTEGER DEFAULT 0,

    -- Structured extraction (JSON)
    material_events       JSONB DEFAULT '[]'::jsonb,
    financial_metrics     JSONB DEFAULT '[]'::jsonb,
    insider_transactions  JSONB DEFAULT '[]'::jsonb,
    risk_factors_new      JSONB DEFAULT '[]'::jsonb,
    key_quotes            JSONB DEFAULT '[]'::jsonb,

    -- Extraction metadata
    extraction_model      TEXT,
    extraction_tokens     INTEGER DEFAULT 0,
    extraction_cost_cents REAL DEFAULT 0,

    -- Timestamps
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_filings_ticker ON sec_filing_extracts (ticker);
CREATE INDEX IF NOT EXISTS idx_sec_filings_filed_date ON sec_filing_extracts (filed_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_filings_ticker_type ON sec_filing_extracts (ticker, filing_type);
CREATE INDEX IF NOT EXISTS idx_sec_filings_type_date ON sec_filing_extracts (filing_type, filed_date DESC);

-- Filing change detections: Cross-filing deltas
CREATE TABLE IF NOT EXISTS sec_filing_changes (
    id                  SERIAL PRIMARY KEY,
    ticker              TEXT NOT NULL,
    change_type         TEXT NOT NULL,
    description         TEXT NOT NULL,
    severity            TEXT NOT NULL,
    current_filing_date DATE NOT NULL,
    prior_filing_date   DATE NOT NULL,
    current_accession   TEXT NOT NULL,
    prior_accession     TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_changes_ticker ON sec_filing_changes (ticker);
CREATE INDEX IF NOT EXISTS idx_sec_changes_date ON sec_filing_changes (current_filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_changes_severity ON sec_filing_changes (severity, current_filing_date DESC);

-- Ingestion log for tracking pipeline runs
CREATE TABLE IF NOT EXISTS sec_ingestion_log (
    id              SERIAL PRIMARY KEY,
    run_started_at  TIMESTAMPTZ NOT NULL,
    run_finished_at TIMESTAMPTZ,
    filings_found   INTEGER DEFAULT 0,
    filings_new     INTEGER DEFAULT 0,
    filings_analyzed INTEGER DEFAULT 0,
    changes_detected INTEGER DEFAULT 0,
    total_cost_cents REAL DEFAULT 0,
    status          TEXT DEFAULT 'running',
    error_message   TEXT
);
"""


def get_db_connection() -> PGConnection:
    """Create a PostgreSQL connection."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)


def init_database(conn: PGConnection) -> None:
    """Create tables if they don't exist."""
    with conn.cursor() as cur:
        cur.execute(DB_SCHEMA)
    conn.commit()
    LOG.info("Database schema initialized")


def filing_exists(conn: PGConnection, accession: str) -> bool:
    """Check if a filing has already been processed."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM sec_filing_extracts WHERE accession_number = %s",
            (accession,),
        )
        return cur.fetchone() is not None


def save_filing_extract(conn: PGConnection, meta: FilingMeta, extract: FilingExtract) -> None:
    """Persist a filing extract to the database."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sec_filing_extracts (
                accession_number, filing_type, company, ticker, cik,
                filed_date, filing_url, document_url, raw_text_hash, raw_text_length,
                material_events, financial_metrics, insider_transactions,
                risk_factors_new, key_quotes,
                extraction_model, extraction_tokens, extraction_cost_cents
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            ON CONFLICT (accession_number) DO UPDATE SET
                material_events = EXCLUDED.material_events,
                financial_metrics = EXCLUDED.financial_metrics,
                insider_transactions = EXCLUDED.insider_transactions,
                risk_factors_new = EXCLUDED.risk_factors_new,
                key_quotes = EXCLUDED.key_quotes,
                extraction_model = EXCLUDED.extraction_model,
                extraction_tokens = EXCLUDED.extraction_tokens,
                extraction_cost_cents = EXCLUDED.extraction_cost_cents,
                updated_at = NOW()
            """,
            (
                meta.accession_number,
                extract.filing_type,
                extract.company,
                extract.ticker,
                meta.cik,
                extract.filed_date,
                meta.filing_url,
                meta.document_url,
                meta.raw_text_hash,
                meta.raw_text_length,
                json.dumps([asdict(e) for e in extract.material_events]),
                json.dumps([asdict(m) for m in extract.financial_metrics_changed]),
                json.dumps([asdict(t) for t in extract.insider_transactions]),
                json.dumps(extract.risk_factors_new),
                json.dumps(extract.key_quotes),
                extract.extraction_model,
                extract.extraction_tokens,
                extract.extraction_cost_cents,
            ),
        )
    conn.commit()


def save_filing_changes(conn: PGConnection, changes: list[FilingChange]) -> int:
    """Persist detected changes to the database."""
    if not changes:
        return 0
    with conn.cursor() as cur:
        for c in changes:
            cur.execute(
                """
                INSERT INTO sec_filing_changes (
                    ticker, change_type, description, severity,
                    current_filing_date, prior_filing_date,
                    current_accession, prior_accession
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    c.ticker, c.change_type, c.description, c.severity,
                    c.current_filing_date, c.prior_filing_date,
                    c.current_accession, c.prior_accession,
                ),
            )
    conn.commit()
    return len(changes)


def get_prior_filing(
    conn: PGConnection, ticker: str, filing_type: str, before_date: str
) -> Optional[dict]:
    """Get the most recent prior filing of the same type for comparison."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT * FROM sec_filing_extracts
            WHERE ticker = %s AND filing_type = %s AND filed_date < %s
            ORDER BY filed_date DESC LIMIT 1
            """,
            (ticker, filing_type, before_date),
        )
        return cur.fetchone()


def log_ingestion_run(
    conn: PGConnection, started_at: datetime, **kwargs
) -> int:
    """Log a pipeline run for monitoring."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sec_ingestion_log (run_started_at, run_finished_at,
                filings_found, filings_new, filings_analyzed, changes_detected,
                total_cost_cents, status, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                started_at,
                kwargs.get("finished_at"),
                kwargs.get("filings_found", 0),
                kwargs.get("filings_new", 0),
                kwargs.get("filings_analyzed", 0),
                kwargs.get("changes_detected", 0),
                kwargs.get("total_cost_cents", 0),
                kwargs.get("status", "completed"),
                kwargs.get("error_message"),
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return row[0] if row else 0


# ═══════════════════════════════════════════════════════════════
# 1. SEC FILING INGESTER
# ═══════════════════════════════════════════════════════════════

# CIK → Ticker mapping cache (built from EDGAR company tickers JSON)
_CIK_TICKER_MAP: dict[str, str] = {}


def _load_cik_ticker_map(client: httpx.Client) -> None:
    """Load CIK → ticker mapping from EDGAR company_tickers.json."""
    global _CIK_TICKER_MAP
    if _CIK_TICKER_MAP:
        return
    try:
        resp = client.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers={"User-Agent": EDGAR_USER_AGENT},
        )
        resp.raise_for_status()
        data = resp.json()
        for entry in data.values():
            cik_str = str(entry.get("cik_str", "")).zfill(10)
            ticker = entry.get("ticker", "")
            if cik_str and ticker:
                _CIK_TICKER_MAP[cik_str] = ticker.upper()
        LOG.info("Loaded %d CIK→ticker mappings", len(_CIK_TICKER_MAP))
    except Exception as e:
        LOG.warning("Failed to load CIK ticker map: %s", e)


def _cik_to_ticker(cik: str) -> str:
    """Resolve a CIK to a ticker symbol."""
    padded = cik.zfill(10)
    return _CIK_TICKER_MAP.get(padded, "")


class SECFilingIngester:
    """
    Connects to SEC EDGAR EFTS (full-text search) API to pull recent filings.
    EDGAR EFTS is free, no API key needed — just a User-Agent header.
    Rate limit: 10 req/sec.
    """

    EFTS_BASE = "https://efts.sec.gov/LATEST/search-index"
    EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index"
    EDGAR_FULL_TEXT = "https://efts.sec.gov/LATEST/search-index"
    EDGAR_FILING_SEARCH = "https://efts.sec.gov/LATEST/search-index"

    def __init__(self):
        self.client = httpx.Client(
            timeout=30,
            headers={"User-Agent": EDGAR_USER_AGENT},
            follow_redirects=True,
        )
        _load_cik_ticker_map(self.client)

    def close(self):
        self.client.close()

    def fetch_recent_filings(
        self,
        hours_back: int = 24,
        filing_types: list[str] | None = None,
    ) -> list[FilingMeta]:
        """
        Pull all filings of the specified types filed in the last N hours.
        Uses EDGAR full-text search API (EFTS).
        """
        types = filing_types or FILING_TYPES
        date_from = (
            datetime.now(timezone.utc) - timedelta(hours=hours_back)
        ).strftime("%Y-%m-%d")
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        all_filings: list[FilingMeta] = []

        for ftype in types:
            try:
                filings = self._search_filings(ftype, date_from, date_to)
                all_filings.extend(filings)
                LOG.info("Found %d %s filings since %s", len(filings), ftype, date_from)
                time.sleep(EDGAR_DELAY)
            except Exception as e:
                LOG.error("Error fetching %s filings: %s", ftype, e)

        return all_filings

    def _search_filings(
        self, filing_type: str, date_from: str, date_to: str
    ) -> list[FilingMeta]:
        """Search EDGAR for filings of a specific type in a date range."""
        # Use EDGAR full-text search API
        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": f'"form-type":"{filing_type}"',
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": date_to,
            "forms": filing_type,
        }

        # Fallback to EDGAR filing search API
        search_url = "https://efts.sec.gov/LATEST/search-index"

        # Primary approach: use EDGAR XBRL/filing RSS feeds
        return self._fetch_from_edgar_rss(filing_type, date_from)

    def _fetch_from_edgar_rss(
        self, filing_type: str, date_from: str
    ) -> list[FilingMeta]:
        """
        Fetch recent filings via EDGAR full-text search API.
        This is the most reliable free approach.
        """
        # Map filing types to EDGAR form names
        form_map = {"4": "4", "8-K": "8-K", "10-Q": "10-Q", "10-K": "10-K"}
        form = form_map.get(filing_type, filing_type)

        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": "*",
            "forms": form,
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }

        # Use EDGAR full-text search
        search_url = f"https://efts.sec.gov/LATEST/search-index?q=%22{form}%22&forms={form}&startdt={date_from}"

        # Better approach: EDGAR company filing API
        results: list[FilingMeta] = []

        try:
            # Use the EDGAR full-text search endpoint
            resp = self.client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params={
                    "q": f'"{form}"',
                    "forms": form,
                    "dateRange": "custom",
                    "startdt": date_from,
                    "enddt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "from": "0",
                    "size": "50",
                },
            )

            if resp.status_code != 200:
                # Fallback: use the standard EDGAR filing search
                return self._fetch_from_edgar_fulltext(form, date_from)

            data = resp.json()
            hits = data.get("hits", {}).get("hits", [])

            for hit in hits:
                source = hit.get("_source", {})
                meta = self._parse_edgar_hit(source, filing_type)
                if meta:
                    results.append(meta)

        except Exception:
            return self._fetch_from_edgar_fulltext(form, date_from)

        return results

    def _fetch_from_edgar_fulltext(
        self, form: str, date_from: str
    ) -> list[FilingMeta]:
        """
        Fallback: Use EDGAR full-text search API at efts.sec.gov.
        """
        results: list[FilingMeta] = []

        try:
            resp = self.client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params={
                    "q": f'formType:"{form}"',
                    "startdt": date_from,
                    "enddt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                for hit in data.get("hits", {}).get("hits", []):
                    meta = self._parse_edgar_hit(
                        hit.get("_source", {}), form
                    )
                    if meta:
                        results.append(meta)
        except Exception as e:
            LOG.warning("EDGAR fulltext search failed: %s", e)

        return results

    def _parse_edgar_hit(
        self, source: dict, filing_type: str
    ) -> Optional[FilingMeta]:
        """Parse an EDGAR search result into FilingMeta."""
        try:
            cik = str(source.get("entity_id", source.get("cik", "")))
            company_name = source.get(
                "entity_name",
                source.get("display_names", ["Unknown"])[0]
                if source.get("display_names")
                else "Unknown",
            )
            filed_date = source.get("file_date", source.get("period_of_report", ""))
            accession = source.get("accession_no", source.get("adsh", ""))

            if not accession or not cik:
                return None

            # Clean accession number
            accession_clean = accession.replace("-", "")
            accession_dashed = (
                f"{accession_clean[:10]}-{accession_clean[10:12]}-{accession_clean[12:]}"
                if "-" not in accession
                else accession
            )

            # Resolve ticker
            ticker = _cik_to_ticker(cik) or ""

            # Build URLs
            cik_padded = cik.zfill(10)
            filing_url = (
                f"https://www.sec.gov/cgi-bin/browse-edgar"
                f"?action=getcompany&CIK={cik_padded}&type={filing_type}"
                f"&dateb=&owner=include&count=10"
            )
            document_url = (
                f"https://www.sec.gov/Archives/edgar/data/"
                f"{cik_padded}/{accession_clean}/"
            )

            return FilingMeta(
                accession_number=accession_dashed,
                filing_type=filing_type if filing_type != "4" else "Form 4",
                company_name=company_name,
                ticker=ticker,
                cik=cik,
                filed_date=filed_date,
                filing_url=filing_url,
                document_url=document_url,
            )
        except Exception as e:
            LOG.debug("Failed to parse EDGAR hit: %s", e)
            return None

    def download_filing_text(self, meta: FilingMeta) -> Optional[str]:
        """
        Download the primary filing document and extract plain text.
        Returns the text content or None if download fails.
        """
        try:
            # Try to get the filing index page to find the primary document
            accession_clean = meta.accession_number.replace("-", "")
            cik_padded = meta.cik.zfill(10)
            index_url = (
                f"https://www.sec.gov/Archives/edgar/data/"
                f"{cik_padded}/{accession_clean}/"
            )

            time.sleep(EDGAR_DELAY)
            resp = self.client.get(index_url)

            if resp.status_code != 200:
                LOG.warning("Failed to fetch index for %s: %d",
                            meta.accession_number, resp.status_code)
                return None

            # Find the primary document link (usually .htm or .txt)
            text = resp.text
            doc_links = re.findall(
                r'href="([^"]+\.(?:htm|html|txt))"', text, re.IGNORECASE
            )

            if not doc_links:
                LOG.warning("No document links found for %s", meta.accession_number)
                return None

            # Pick the first .htm document (usually the filing itself)
            doc_path = doc_links[0]
            if not doc_path.startswith("http"):
                doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik_padded}/{accession_clean}/{doc_path}"
            else:
                doc_url = doc_path

            time.sleep(EDGAR_DELAY)
            doc_resp = self.client.get(doc_url)

            if doc_resp.status_code != 200:
                return None

            raw_html = doc_resp.text
            plain_text = html_to_text(raw_html)

            # Compute hash for deduplication
            meta.raw_text_hash = hashlib.sha256(
                plain_text.encode()
            ).hexdigest()[:16]
            meta.raw_text_length = len(plain_text)

            return plain_text

        except Exception as e:
            LOG.error("Failed to download filing %s: %s", meta.accession_number, e)
            return None


# ═══════════════════════════════════════════════════════════════
# 2. FILING ANALYZER (Claude-powered extraction)
# ═══════════════════════════════════════════════════════════════

EXTRACTION_PROMPT = """You are a financial analyst extracting structured data from SEC filings.
Given the following filing, extract ALL of the following if present.
Return ONLY valid JSON, no preamble, no markdown code fences.

{
  "filing_type": "8-K" | "10-Q" | "10-K" | "Form 4",
  "company": "string",
  "ticker": "string",
  "filed_date": "YYYY-MM-DD",
  "material_events": [
    {
      "event_type": "guidance_change" | "executive_departure" | "acquisition"
        | "divestiture" | "restructuring" | "debt_issuance" | "buyback_authorization"
        | "dividend_change" | "legal_proceeding" | "cybersecurity_incident"
        | "restatement" | "other",
      "summary": "One sentence, specific with numbers",
      "sentiment": "positive" | "negative" | "neutral",
      "magnitude": "high" | "medium" | "low"
    }
  ],
  "financial_metrics_changed": [
    { "metric": "revenue_guidance", "old_value": "string", "new_value": "string" }
  ],
  "insider_transactions": [
    { "name": "string", "title": "string", "action": "buy" | "sell",
      "shares": number, "price": number, "total_value": number }
  ],
  "risk_factors_new": ["string array of any NEW risk factors not in prior filing"],
  "key_quotes": ["Up to 3 direct quotes from management that move the needle"]
}

RULES:
- If a field has no data, use an empty array [].
- For insider_transactions, only populate for Form 4 filings.
- For risk_factors_new, only populate for 10-Q and 10-K filings.
- Be specific with numbers in summaries (dollar amounts, percentages, shares).
- For key_quotes, select quotes that would move a stock price.
"""


class FilingAnalyzer:
    """
    Sends filing text to Claude for structured extraction.
    Uses Sonnet for cost efficiency on high-volume extraction.
    """

    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def analyze(self, meta: FilingMeta, text: str) -> Optional[FilingExtract]:
        """
        Extract structured data from filing text via Claude.
        Returns FilingExtract or None on failure.
        """
        # Truncate very large filings
        if len(text) > MAX_FILING_CHARS:
            # Keep intro + ending (most important sections)
            half = MAX_FILING_CHARS // 2
            text = (
                text[:half]
                + "\n\n[... middle of filing truncated for analysis ...]\n\n"
                + text[-half:]
            )

        filing_context = (
            f"Filing Type: {meta.filing_type}\n"
            f"Company: {meta.company_name}\n"
            f"Ticker: {meta.ticker or 'Unknown'}\n"
            f"CIK: {meta.cik}\n"
            f"Filed Date: {meta.filed_date}\n"
            f"Accession: {meta.accession_number}\n\n"
            f"--- FILING CONTENT ---\n\n{text}"
        )

        try:
            response = self.client.messages.create(
                model=EXTRACTION_MODEL,
                max_tokens=EXTRACTION_MAX_TOKENS,
                messages=[{
                    "role": "user",
                    "content": EXTRACTION_PROMPT + "\n\n" + filing_context,
                }],
            )

            # Extract text
            raw_output = "".join(
                block.text for block in response.content
                if block.type == "text"
            ).strip()

            # Strip markdown fences
            raw_output = re.sub(r"```json?\s*", "", raw_output)
            raw_output = raw_output.replace("```", "").strip()

            # Parse JSON
            data = json.loads(raw_output)

            # Calculate cost (Sonnet: $3/MTok in, $15/MTok out)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost_cents = (
                input_tokens * 3 / 1_000_000 + output_tokens * 15 / 1_000_000
            ) * 100

            extract = FilingExtract(
                filing_type=data.get("filing_type", meta.filing_type),
                company=data.get("company", meta.company_name),
                ticker=data.get("ticker", meta.ticker) or meta.ticker,
                filed_date=data.get("filed_date", meta.filed_date),
                accession_number=meta.accession_number,
                material_events=[
                    MaterialEvent(**e) for e in data.get("material_events", [])
                ],
                financial_metrics_changed=[
                    FinancialMetricChange(**m)
                    for m in data.get("financial_metrics_changed", [])
                ],
                insider_transactions=[
                    InsiderTransaction(**t)
                    for t in data.get("insider_transactions", [])
                ],
                risk_factors_new=data.get("risk_factors_new", []),
                key_quotes=data.get("key_quotes", []),
                extraction_model=EXTRACTION_MODEL,
                extraction_tokens=input_tokens + output_tokens,
                extraction_cost_cents=round(cost_cents, 2),
            )

            LOG.info(
                "Extracted %s for %s (%s): %d events, %d metrics, %d insider txns | %.1f¢",
                meta.filing_type,
                meta.ticker or meta.company_name,
                meta.filed_date,
                len(extract.material_events),
                len(extract.financial_metrics_changed),
                len(extract.insider_transactions),
                cost_cents,
            )

            return extract

        except json.JSONDecodeError as e:
            LOG.error("JSON parse error for %s: %s", meta.accession_number, e)
            return None
        except anthropic.APIError as e:
            LOG.error("Claude API error for %s: %s", meta.accession_number, e)
            return None
        except Exception as e:
            LOG.error("Extraction failed for %s: %s", meta.accession_number, e)
            return None


# ═══════════════════════════════════════════════════════════════
# 3. FILING CHANGE DETECTOR
# ═══════════════════════════════════════════════════════════════

class FilingChangeDetector:
    """
    Compares consecutive filings (10-Q to 10-Q, 10-K to 10-K) for the
    same company and flags material changes that create alpha signals.
    """

    @staticmethod
    def detect_changes(
        current: FilingExtract,
        prior: dict,
    ) -> list[FilingChange]:
        """
        Compare a new filing extract against the prior filing of the same type.
        Returns a list of detected changes.
        """
        changes: list[FilingChange] = []

        if not prior:
            return changes

        prior_date = str(prior.get("filed_date", ""))
        prior_accession = prior.get("accession_number", "")

        # 1. Revenue guidance changes
        changes.extend(
            FilingChangeDetector._check_guidance_changes(
                current, prior, prior_date, prior_accession
            )
        )

        # 2. New risk factors
        changes.extend(
            FilingChangeDetector._check_new_risk_factors(
                current, prior, prior_date, prior_accession
            )
        )

        # 3. Material event severity
        changes.extend(
            FilingChangeDetector._check_high_impact_events(
                current, prior_date, prior_accession
            )
        )

        # 4. Sentiment tone shift
        changes.extend(
            FilingChangeDetector._check_tone_shift(
                current, prior, prior_date, prior_accession
            )
        )

        return changes

    @staticmethod
    def _check_guidance_changes(
        current: FilingExtract, prior: dict,
        prior_date: str, prior_accession: str,
    ) -> list[FilingChange]:
        """Flag any guidance metric changes between filings."""
        changes: list[FilingChange] = []

        current_metrics = {
            m.metric: m for m in current.financial_metrics_changed
        }

        prior_metrics_raw = prior.get("financial_metrics", [])
        if isinstance(prior_metrics_raw, str):
            try:
                prior_metrics_raw = json.loads(prior_metrics_raw)
            except (json.JSONDecodeError, TypeError):
                prior_metrics_raw = []

        prior_metrics = {
            m.get("metric", ""): m for m in prior_metrics_raw if isinstance(m, dict)
        }

        for metric_name, current_metric in current_metrics.items():
            if "guidance" in metric_name.lower() or "outlook" in metric_name.lower():
                prior_metric = prior_metrics.get(metric_name)
                severity = "high" if "revenue" in metric_name.lower() else "medium"

                desc = (
                    f"{current.company} changed {metric_name}: "
                    f"{current_metric.old_value} → {current_metric.new_value}"
                )

                changes.append(FilingChange(
                    ticker=current.ticker,
                    change_type="guidance_change",
                    description=desc,
                    severity=severity,
                    current_filing_date=current.filed_date,
                    prior_filing_date=prior_date,
                    current_accession=current.accession_number,
                    prior_accession=prior_accession,
                ))

        return changes

    @staticmethod
    def _check_new_risk_factors(
        current: FilingExtract, prior: dict,
        prior_date: str, prior_accession: str,
    ) -> list[FilingChange]:
        """Flag new risk factors not present in the prior filing."""
        changes: list[FilingChange] = []

        prior_risks_raw = prior.get("risk_factors_new", [])
        if isinstance(prior_risks_raw, str):
            try:
                prior_risks_raw = json.loads(prior_risks_raw)
            except (json.JSONDecodeError, TypeError):
                prior_risks_raw = []

        prior_risk_set = {r.lower().strip() for r in prior_risks_raw if isinstance(r, str)}

        for risk in current.risk_factors_new:
            if risk.lower().strip() not in prior_risk_set:
                changes.append(FilingChange(
                    ticker=current.ticker,
                    change_type="new_risk_factor",
                    description=f"New risk factor: {risk[:200]}",
                    severity="medium",
                    current_filing_date=current.filed_date,
                    prior_filing_date=prior_date,
                    current_accession=current.accession_number,
                    prior_accession=prior_accession,
                ))

        return changes

    @staticmethod
    def _check_high_impact_events(
        current: FilingExtract,
        prior_date: str, prior_accession: str,
    ) -> list[FilingChange]:
        """Flag high-magnitude material events."""
        changes: list[FilingChange] = []

        for event in current.material_events:
            if event.magnitude == "high":
                changes.append(FilingChange(
                    ticker=current.ticker,
                    change_type=event.event_type,
                    description=event.summary,
                    severity="high",
                    current_filing_date=current.filed_date,
                    prior_filing_date=prior_date or current.filed_date,
                    current_accession=current.accession_number,
                    prior_accession=prior_accession or "",
                ))

        return changes

    @staticmethod
    def _check_tone_shift(
        current: FilingExtract, prior: dict,
        prior_date: str, prior_accession: str,
    ) -> list[FilingChange]:
        """
        Simple sentiment delta: compare overall sentiment distribution
        of material events between filings.
        """
        changes: list[FilingChange] = []

        # Current sentiment distribution
        cur_sentiment = {"positive": 0, "negative": 0, "neutral": 0}
        for event in current.material_events:
            cur_sentiment[event.sentiment] = cur_sentiment.get(event.sentiment, 0) + 1

        # Prior sentiment distribution
        prior_events_raw = prior.get("material_events", [])
        if isinstance(prior_events_raw, str):
            try:
                prior_events_raw = json.loads(prior_events_raw)
            except (json.JSONDecodeError, TypeError):
                prior_events_raw = []

        prev_sentiment = {"positive": 0, "negative": 0, "neutral": 0}
        for event in prior_events_raw:
            if isinstance(event, dict):
                s = event.get("sentiment", "neutral")
                prev_sentiment[s] = prev_sentiment.get(s, 0) + 1

        cur_total = sum(cur_sentiment.values()) or 1
        prev_total = sum(prev_sentiment.values()) or 1

        cur_score = (
            cur_sentiment["positive"] - cur_sentiment["negative"]
        ) / cur_total
        prev_score = (
            prev_sentiment["positive"] - prev_sentiment["negative"]
        ) / prev_total

        delta = cur_score - prev_score

        # Flag significant tone shifts (> 0.3 on -1 to 1 scale)
        if abs(delta) > 0.3:
            direction = "more positive" if delta > 0 else "more negative"
            changes.append(FilingChange(
                ticker=current.ticker,
                change_type="tone_shift",
                description=(
                    f"Filing tone shifted {direction} "
                    f"(sentiment delta: {delta:+.2f})"
                ),
                severity="medium" if abs(delta) < 0.6 else "high",
                current_filing_date=current.filed_date,
                prior_filing_date=prior_date,
                current_accession=current.accession_number,
                prior_accession=prior_accession,
            ))

        return changes


# ═══════════════════════════════════════════════════════════════
# 4. PIPELINE ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════

def run_pipeline(hours_back: int = 24) -> dict:
    """
    Run one full ingestion → analysis → change detection cycle.
    Returns a summary dict of the run.
    """
    started_at = datetime.now(timezone.utc)
    stats = {
        "filings_found": 0,
        "filings_new": 0,
        "filings_analyzed": 0,
        "changes_detected": 0,
        "total_cost_cents": 0.0,
        "errors": [],
    }

    LOG.info("═══ Starting SEC Filing Pipeline (last %dh) ═══", hours_back)

    # Initialize components
    ingester = SECFilingIngester()
    analyzer = FilingAnalyzer()
    detector = FilingChangeDetector()

    conn: Optional[PGConnection] = None
    try:
        conn = get_db_connection()
        init_database(conn)
    except Exception as e:
        LOG.error("Database connection failed: %s", e)
        stats["errors"].append(f"DB: {e}")
        # Continue without DB — log results to stdout
        conn = None

    try:
        # Step 1: Ingest recent filings from EDGAR
        filings = ingester.fetch_recent_filings(hours_back=hours_back)
        stats["filings_found"] = len(filings)
        LOG.info("Found %d total filings", len(filings))

        for meta in filings:
            # Skip if no ticker (can't index without it)
            if not meta.ticker:
                continue

            # Skip if already processed
            if conn and filing_exists(conn, meta.accession_number):
                continue

            stats["filings_new"] += 1

            # Step 2: Download filing text
            text = ingester.download_filing_text(meta)
            if not text:
                continue

            # Step 3: Analyze with Claude
            extract = analyzer.analyze(meta, text)
            if not extract:
                continue

            stats["filings_analyzed"] += 1
            stats["total_cost_cents"] += extract.extraction_cost_cents

            # Step 4: Store extract
            if conn:
                save_filing_extract(conn, meta, extract)

            # Step 5: Detect changes (for 10-Q and 10-K)
            if meta.filing_type in ("10-Q", "10-K") and conn:
                prior = get_prior_filing(
                    conn, extract.ticker, meta.filing_type, extract.filed_date
                )
                if prior:
                    changes = detector.detect_changes(extract, prior)
                    if changes:
                        saved = save_filing_changes(conn, changes)
                        stats["changes_detected"] += saved
                        for c in changes:
                            LOG.info(
                                "  CHANGE: [%s] %s — %s (%s)",
                                c.ticker, c.change_type, c.description, c.severity,
                            )

    except Exception as e:
        LOG.error("Pipeline error: %s", e)
        stats["errors"].append(str(e))

    finally:
        ingester.close()

    # Log run stats
    finished_at = datetime.now(timezone.utc)
    duration = (finished_at - started_at).total_seconds()

    if conn:
        try:
            log_ingestion_run(
                conn,
                started_at,
                finished_at=finished_at,
                filings_found=stats["filings_found"],
                filings_new=stats["filings_new"],
                filings_analyzed=stats["filings_analyzed"],
                changes_detected=stats["changes_detected"],
                total_cost_cents=stats["total_cost_cents"],
                status="completed" if not stats["errors"] else "partial",
                error_message="; ".join(stats["errors"]) if stats["errors"] else None,
            )
            conn.close()
        except Exception:
            pass

    LOG.info(
        "═══ Pipeline Complete: %d found, %d new, %d analyzed, %d changes | "
        "%.1f¢ cost | %.1fs ═══",
        stats["filings_found"],
        stats["filings_new"],
        stats["filings_analyzed"],
        stats["changes_detected"],
        stats["total_cost_cents"],
        duration,
    )

    return stats


# ═══════════════════════════════════════════════════════════════
# 5. SCHEDULED RUNNER (30-min market hours)
# ═══════════════════════════════════════════════════════════════

def is_market_hours() -> bool:
    """Check if US markets are open (9:00 AM - 5:00 PM ET, weekdays)."""
    from zoneinfo import ZoneInfo

    now = datetime.now(ZoneInfo("America/New_York"))
    # Weekday check (0=Mon, 6=Sun)
    if now.weekday() >= 5:
        return False
    # Extended hours: 9:00 AM to 5:00 PM ET
    hour = now.hour
    return 9 <= hour < 17


def run_daemon():
    """
    Run as a daemon: execute pipeline every 30 minutes during market hours.
    Outside market hours, run once per hour.
    """
    LOG.info("Starting SEC Analyzer daemon...")
    LOG.info("Schedule: every 30min during market hours, every 60min otherwise")

    while True:
        try:
            if is_market_hours():
                LOG.info("Market hours — running pipeline")
                run_pipeline(hours_back=1)  # Last 1 hour during market
                sleep_seconds = 30 * 60  # 30 minutes
            else:
                LOG.info("After hours — running pipeline")
                run_pipeline(hours_back=4)  # Last 4 hours after close
                sleep_seconds = 60 * 60  # 1 hour
        except Exception as e:
            LOG.error("Daemon cycle error: %s", e)
            sleep_seconds = 5 * 60  # Retry in 5 minutes on error

        LOG.info("Sleeping %d minutes until next cycle...", sleep_seconds // 60)
        time.sleep(sleep_seconds)


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SEC Filing Analyzer Pipeline")
    parser.add_argument(
        "--daemon", action="store_true",
        help="Run as a daemon (30-min market hours schedule)",
    )
    parser.add_argument(
        "--backfill", type=int, default=0,
        help="Backfill filings from the last N days",
    )
    parser.add_argument(
        "--hours", type=int, default=24,
        help="Hours to look back for filings (default: 24)",
    )
    args = parser.parse_args()

    if args.daemon:
        run_daemon()
    elif args.backfill > 0:
        LOG.info("Backfilling last %d days...", args.backfill)
        run_pipeline(hours_back=args.backfill * 24)
    else:
        run_pipeline(hours_back=args.hours)
