# Sop Management

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: IMPLEMENTED; immutable publication and role access VERIFIED LOCALLY.

Separate SOP kind GENERAL/PRODUCT/PACKAGING with product associations, Markdown body, custom sections, attachments and configurable requirements. Administrators supply real fabric/size/design/stitching/label measurements and acceptance rules; none are invented. Packaging editor can load CRUISIN's ten requested default steps, including optional fragrance, and edit/remove them. Requirements flag mandatory, evidence and unique-unit scan checks.

Draft edits do not change the last published version visible to employees. Publication creates immutable version snapshots and increments version. Role/product scope and published status gate employee use. QC and packaging retain exact SOP publication version, actor, evidence and timestamp; future publication does not rewrite them. Acknowledgments are version-specific and transactionally protected against a publication race. Employees can suggest changes through approvals but cannot publish.

Product and packaging SOPs follow DRAFT→REVIEW→PUBLISHED→ARCHIVED. Publication review is version-bound and independent; author self-approval is rejected. General legacy SOPs retain permission-controlled publication. QC/packaging mandatory requirements are server-validated, including private evidence and scan identity. Administrators configure custom specification sections and measurement rules with units, required flags and min/max bounds. QC cannot pass with missing required or out-of-range measurements.
