---
description: List KSeF invoices received (issued TO me) during the previous calendar month
allowed-tools: mcp__Ksef-Mcp__ksef_authenticate, mcp__Ksef-Mcp__ksef_query_invoices, mcp__Ksef-Mcp__ksef_session_status
---

Fetch all KSeF invoices that were issued **to me** (received) during the **previous calendar month**.

Steps:
1. Compute the previous calendar month relative to today's date. Date range is the first day through the last day of that month (YYYY-MM-DD).
2. Call `mcp__Ksef-Mcp__ksef_authenticate` first. If a session already exists (`mcp__Ksef-Mcp__ksef_session_status` returns active), skip re-auth.
3. Call `mcp__Ksef-Mcp__ksef_query_invoices` with:
   - `subjectType`: `Subject2` (invoices issued TO me)
   - `dateFrom`: first day of previous month
   - `dateTo`: last day of previous month
   - `dateType`: `Invoicing`
4. Present the results as a compact table with: invoice number, KSeF number, invoicing date, seller NIP, seller name, gross amount, currency. Include the total gross amount and invoice count at the bottom. If `hasMore` or `isTruncated` is true, note it.
