# Official workbook inventory and mapping `nscmf-form-3.0/v1`

BE-104 / T47–T48 (gap G10). Source: `NSCMF-Form-3.0.xlsx` supplied by the project owner on
2026-09-23, SHA-256 `731e1fa0f9972c4b11d85e7a6e40d8b5c20b54ed9e3bba52c449114ca8328a45`,
67,465 bytes. The binary is private: it is registered with `php artisan nscmf:template:register`
into `nscmf_private/templates/` and is never committed.

Status: **mapping implemented, owner review pending.** Rows marked *decision* are choices the
workbook does not settle by itself; they are listed at the end for review.

## Package inventory

- 50 OOXML members. Two worksheets: `sheet1.xml` = **NSCMF - Activation** (print area
  `A1:AW78`), `sheet2.xml` = **NSCMF - Change** (print area `A1:AW70`).
- Native Excel form controls only (no macros): 14 checkboxes per sheet as legacy VML shapes
  (`xl/drawings/vmlDrawing1.vml`, `vmlDrawing2.vml`) with `xl/ctrlProps/ctrlProp1..28.xml`;
  DrawingML (`drawing1/2.xml`) carries the logo image `xl/media/image1.png`.
- No linked cells (`fmlaLink`) on any control: a checkbox is set by patching both its
  `ctrlProp` (`checked="Checked"`) and its VML shape (`<x:Checked>1</x:Checked>`).
- 134 shared strings (labels only). Values are written as inline strings into the existing
  styled cells, so `sharedStrings.xml` is never rewritten.
- Fonts: Calibri, Aptos Narrow, Aptos Display (see BE-114 for renderer availability).

## Patch rules

The patcher rewrites only the members it must change — the two sheet XMLs, the checked
controls' `ctrlProp` + VML members, and `workbook.xml` to hide the other family's sheet — and
verifies that every other member is byte-identical and that the member list is unchanged.

## Activation — `sheet1.xml`

| Field | Cell / control |
| --- | --- |
| Request No / request date | `AP4` / `AP5` |
| Subtype ACTIVATION / UPGRADE_DOWNGRADE / DEACTIVATION | shapes `8194` / `8216` / `8193`+`8195` (*decision*: both overlapping row-3 boxes) |
| references IWO / VELOSHIP / TICKET / OTHER (checkbox, specification) | `8205`,`C12` / `8196`,`O12` / `8197`,`AA12` / `8198`,`AM12` |
| customer_name / contact_name | `B15` / `Z15` |
| EXISTING service: id, status ACTIVATED/DEACTIVATED, description, location | `B18`, `8199`/`8200`, `B20`, `B22` |
| NEW service: id, status, description, location | `Z18`, `8201`/`8202`, `Z20`, `Z22` |
| installation_rfs_date | `B24` |
| sla_items 1..3 | `R24`, `R25`, `R26` |
| lan_ip_allocation / wan_ip (address / prefix) / gateway | `D32` / `M32` + `W32` / `AG32` (*decision*: `A32` is a two-column merge too narrow for a prefix list) |
| pop / regional / preferred_upstream / secondary_upstream | `A34` / `M34` / `Y34` / `AK34` |
| primary_noc_link / downlink_router / secondary_noc_link | `A36` / `M36` / `Y36` (*decision*: one `downlink_router` value goes to the primary column) |
| bandwidth international / domestic IIX / mixed (Mbps) | `H40` / `H41` / `H42` |
| virtual_connections 1..3 (Mbps) | `Z40`, `Z41`, `Z42` |
| priority_destinations 1..3 | `AE40`, `AE41`, `AE42` |
| domain_name_1 / domain_name_2 / primary_dns / secondary_dns | `F47` / `F48` / `F49` / `F50` |
| mx_primary / mx_secondary | `W47` / `W48` |
| hosting_platform / hosting_capacity_gb | `AJ47` / `AJ48` |
| migrate_domain / migrate_hosting | shapes `8203` / `8204` |
| direct_site local_loops / lastmile | `I55` / `AM55` (*decision*: single `local_loops` in the primary column) |
| direct_site bwa / antenna_tower | `I56` / `AM56` (*decision*: the separate "Antenna" cell `W56` stays empty) |
| direct_site direction / rssi / latency_ms / packet_loss_percent | `I57` / `W57` / `AM57` / `AR57` |
| direct_site routers / ups / stabilizer / cable | `I59` / `AC59` / `AC60` / `I61` |
| pop_site switch_distribution / port / vlan_id | `I64` / `AB64` / `AM64` |
| pop_site local_loops / routers / cpe_indoor / cpe_outdoor | `I65` / `I66` / `I67` / `AB67` |
| Requested By name / date · Reviewed By · Approved By | `A75`/`A77` · `Q75`/`Q77` · `AG75`/`AG77` |

## Change — `sheet2.xml`

| Field | Cell / control |
| --- | --- |
| Request No / request date | `AQ4` / `AQ5` |
| Subtype MAINTENANCE / UPGRADE / EMERGENCY | shapes `7269` / `7317` / `7268`+`7270` (*decision* as above) |
| facing_challenges 1..3 / maintenance_purpose | `C14`, `C15`, `C16` / `Z14` |
| identified_problems 1..3 | `C20`, `C21`, `C22` |
| service_impacts NOC15 / NOC23 / NOC361 / REGIONAL / POP / CUSTOMER / OTHER | shapes `7306` / `7308` / `7309` / `7307` / `7313` / `7318` / `7310` |
| OTHER description | `H31` (the underlined line; `H30` overlaps the label) |
| improvement_items 1..3 plan / target_kpi | `C34`, `C35`, `C36` / `Z34`, `Z35`, `Z36` |
| target_execution_date / monitoring period (value + unit) | `L39` / `AF39` (clear of the long labels) |
| rollback_scenario | `J40` |
| announcement ONE_WEEK / TWO_WEEKS / TWO_DAYS_EMERGENCY | shapes `7314` / `7315` / `7316` |
| results 1..5 summary / performance / status | `B50..B54` / `V50..V54` / `AH50..AH54` |
| Requested By name / date · Reviewed By · Approved By | `A67`/`A69` · `Q67`/`Q69` · `AG67`/`AG69` |

## Presentation choices

- Dates are written as `YYYY-MM-DD`; timestamps of sign-offs as the Asia/Jakarta date.
- Numbers are written as plain decimal text without trailing zeros (`100`, `2.5`).
- Signature cells stay empty: a human signature is not a digital signature, and the Approved PDF
  is signed by the Organization certificate, not by the Approver (10 §signing).
- "Page" (`AP6`/`AQ6`) is left empty.
- The other family's sheet is hidden in the XLSX. LibreOffice still prints hidden sheets, so
  the PDF keeps only the family's pages (the blank other sheet is exactly one page).
- Cells keep the template's own font and colour; some input styles are light grey by design.

## Decisions for owner review

1. Deactivation/Emergency are each drawn with two overlapping checkboxes; v1 checks both.
2. Single-value model fields placed in the primary column: `downlink_router`, `local_loops`,
   `routers`; the "Antenna" cell `W56` has no model field and stays empty.
3. Date format `YYYY-MM-DD`; "Page" left empty; the other sheet hidden.
4. WAN IP `a.b.c.d/nn` is split into the address cell `M32` and the prefix cell `W32`.

A change to any of these is a new `mapping_version`, never an edit of v1.
