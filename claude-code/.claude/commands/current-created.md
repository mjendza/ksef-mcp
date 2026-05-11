---
description: List KSeF invoices issued BY me during the current calendar month
allowed-tools: mcp__Ksef-Mcp__ksef_authenticate, mcp__Ksef-Mcp__ksef_query_invoices, mcp__Ksef-Mcp__ksef_session_status
---

Fetch all KSeF invoices that were issued **by me** (created/sent) during the **current calendar month**.

Steps:
1. Compute the current calendar month relative to today's date. Date range is the first day of the current month through today (YYYY-MM-DD).
2. Call `mcp__Ksef-Mcp__ksef_authenticate` first. If a session already exists (`mcp__Ksef-Mcp__ksef_session_status` returns active), skip re-auth.
3. Call `mcp__Ksef-Mcp__ksef_query_invoices` with:
   - `subjectType`: `Subject1` (invoices issued BY me)
   - `dateFrom`: first day of current month
   - `dateTo`: today
   - `dateType`: `Invoicing`
4. Present the results as a compact table with: invoice number, KSeF number, invoicing date, buyer identifier, buyer name, gross amount, currency. Include the total gross amount and invoice count at the bottom. If `hasMore` or `isTruncated` is true, note it.
