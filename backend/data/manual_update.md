# Manual Data Update Guide

This document explains how to add new macro events to the CSV files used by the MacroPulse.

---

## Adding New RBI MPC Events

**File:** `backend/data/mpc_calendar.csv`

### Schema

```csv
id,date,time_ist,decision,basis_points,repo_rate_after,notes
```

### Field Definitions

| Field | Format | Example | Notes |
|---|---|---|---|
| `id` | `MPC-YYYY-MM-DD` | `MPC-2024-08-08` | Must be unique. Use the announcement date. |
| `date` | `YYYY-MM-DD` | `2024-08-08` | Date the decision was announced (last day of MPC meeting). |
| `time_ist` | `HH:MM` | `10:00` | IST time of announcement. RBI typically announces at 10:00 IST since 2020. |
| `decision` | `hike` / `cut` / `hold` | `hold` | Direction of the rate change. |
| `basis_points` | Integer ≥ 0 | `25` | Always positive. Use `0` for hold decisions. |
| `repo_rate_after` | Float | `6.50` | Repo rate after the decision, in percent. |
| `notes` | Free text (quoted) | `"Unanimous decision"` | Optional context. Wrap in double quotes. |

### Steps

1. Go to the [RBI Monetary Policy page](https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx).
2. Find the MPC resolution press release for the event.
3. Add a new row at the bottom of `mpc_calendar.csv`.
4. Verify the date matches the **announcement** date (last day of multi-day meeting).
5. Commit and push.

### Example

```csv
MPC-2024-08-08,2024-08-08,10:00,hold,0,6.50,"Status quo; watching inflation trajectory"
```

---

## Adding New CPI / IIP Events

**File:** `backend/data/consensus.csv`

### Schema

```csv
event_id,event_type,date,actual_value,consensus_value,source,notes
```

### Field Definitions

| Field | Format | Example | Notes |
|---|---|---|---|
| `event_id` | `{TYPE}-YYYY-MM-DD` | `CPI-2024-07-12` | Must be unique. Use the data release date. |
| `event_type` | `CPI` / `IIP` | `CPI` | Type of macro data release. |
| `date` | `YYYY-MM-DD` | `2024-07-12` | Date the data was published by MoSPI. |
| `actual_value` | Float | `5.08` | Actual YoY CPI inflation (%) or IIP growth (%). |
| `consensus_value` | Float or empty | `5.10` | Leave empty if consensus is unknown. **Never fabricate.** |
| `source` | Text | `Reuters poll` | One of: `Finnhub`, `Reuters poll`, `manual`, `RBI SPF`, `unknown`. |
| `notes` | Free text (quoted) | `"CPI for Jun 2024"` | Optional context. |

### Steps for CPI

1. MoSPI releases CPI data around the 12th of each month for the previous month.
2. Check the [MoSPI press release](https://mospi.gov.in/) for the actual CPI YoY value.
3. For consensus: search for the Reuters pre-release poll (usually published 1-2 days before).
4. Add a new row to `consensus.csv`.
5. If consensus is unavailable, leave `consensus_value` empty and set `source` to `unknown`.

### Steps for IIP

1. MoSPI releases IIP data around the 12th of the month (for data two months prior).
2. Check the [MoSPI press release](https://mospi.gov.in/) for the actual IIP growth value.
3. IIP consensus is rarely available publicly — set `source` to `manual` if you find it.
4. Add a new row to `consensus.csv`.

### Example

```csv
CPI-2024-07-12,CPI,2024-07-12,5.08,5.10,Reuters poll,"CPI for Jun 2024"
IIP-2024-07-12,IIP,2024-07-12,5.90,,unknown,"IIP for May 2024; consensus unavailable"
```

---

## Important Rules

1. **Never fabricate consensus values.** If unknown, leave the field empty.
2. **Always use the data release date** (not the period the data covers) for the `date` field.
3. **Verify dates** against official sources (RBI, MoSPI) before adding.
4. **Keep IDs unique.** The format `{TYPE}-YYYY-MM-DD` ensures uniqueness if there's one event per type per day.
5. **After updating**, restart the backend server or run the nightly precompute job to refresh the data.

---

## Data Sources for Reference

| Source | URL | What It Provides |
|---|---|---|
| RBI Press Releases | https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx | MPC decision dates, repo rate changes |
| MoSPI CPI Releases | https://mospi.gov.in/ | Monthly CPI actual values |
| MoSPI IIP Releases | https://mospi.gov.in/ | Monthly IIP actual values |
| Reuters | https://www.reuters.com/markets/asia/ | Pre-release consensus polls |
| RBI SPF | https://www.rbi.org.in/Scripts/PublicationsView.aspx?id=21578 | Quarterly professional forecaster surveys |
