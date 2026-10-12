# Activity Log workbook inventory and mapping `nscmf-activity-log/v1`

T82 / gap G26. The template is the NSCMF Activity Logging Form, derived on 2026-10-12 from the
filled example the project owner supplied (`NSCMF-Log-Example.xlsx`): every entry, period date,
name and the author/path metadata were removed and both checkboxes unchecked, leaving only the
layout, labels and logo. The derived `NSCMF-Log-Template.xlsx` is private: register it with
`php artisan nscmf:template:register NSCMF-Log-Template.xlsx --kind=activity-log --activate`; it
is never committed (`.gitignore`), and neither is the example, which holds real data.

## Package inventory

- 18 OOXML members, one worksheet `xl/worksheets/sheet1.xml` named **NSCMF-Log**, A4 portrait,
  one page with 40 numbered entry rows.
- Two native checkboxes (no macros, no linked cells): shape `1025` / `xl/ctrlProps/ctrlProp1.xml`
  = **NOC15**, shape `1026` / `ctrlProp2.xml` = **NOC23** (legacy VML in `vmlDrawing1.vml`; both
  anchored in rows 5–7, above every row the patcher moves).
- DrawingML `drawing1.xml` carries the logo `xl/media/image1.png`, anchored at A1.
- 17 shared strings, labels only. Values are written as inline strings (text) or numbers (dates)
  into the template's own styled cells, so `sharedStrings.xml` and `styles.xml` never change.
- Font: Aptos Narrow only.

## Cells

| Field | Cell(s) |
| --- | --- |
| Period from / until | `AG5` / `AL5` (date serial, style `d-mmm-yy`) |
| Site Location NOC15 / NOC23 | shape `1025` + `ctrlProp1` / shape `1026` + `ctrlProp2` |
| Entry n (row r = 8 + n) | No `A`, Date `C` (date serial), NSCMF No `G`, Purpose `L`, Customer Name `U`, NOC Infrastructure `AF` |
| Prepared By name / date | `A52` / `A54` (date serial) |
| Acknowledge By name / date | `V52` / `V54` (date serial) |

Entry rows are 9–48 (merges `A:B`, `C:F`, `G:K`, `L:T`, `U:AE`, `AF:AO`). Customer Name and NOC
Infrastructure are cut to 50 characters with `…` so they stay on one line; the web page shows the
whole first line.

## More than 40 entries

Pages hold 40 rows. For n entries the sheet gets `40 × ceil(n / 40)` numbered rows: extra rows are
copies of row 48 (same styles and height) inserted after it with the six merges per row; rows 49–54
(signature block) and their merges move down by the same amount; `dimension` is updated; a manual
page break follows every 40th entry row; `workbook.xml` gains the print title
`'NSCMF-Log'!$8:$8` so the column headings repeat. The title, logo and checkboxes stay on page 1.

## Patch rules

The patcher owns `sheet1.xml`, `workbook.xml` (print titles only), and the checked controls'
`ctrlProp` + VML members; every other member stays byte-identical and the member list is
unchanged, as for `nscmf-form-3.0/v1`.
