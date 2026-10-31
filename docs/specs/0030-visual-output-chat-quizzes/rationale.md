# Rationale: 0030 visual output in chat and quizzes

## Context

Tip can read diagrams but cannot show them. The scan pipeline stores page images plus descriptions, yet no chat tool reaches the stored art, no surface renders it, and the model has no draw contract. Students revising physics meet text descriptions of figures they cannot see, and hand walkthroughs cost turns. Spec 0020 deferred full generative UI as a different decision, and spec 0028 delivers text page numbers only. The forces are light phones on costly bytes (raster art hurts), exam crunch (zero tap beats toggles), the existing owner only note model, the script risk of inline SVG, and a demo date that favors reusing the scan pipeline over new providers. Auth and session come from better-auth as today; Page plus VisualAnalysis come from spec 0027; file storage comes from the Blob path built for chat uploads.

## Options considered

### Option 1: Artifact table plus unified read plus hybrid render

One VisualArtifact row per visual shared by chat, quiz, and notes; one read serves scans plus drawn art; Mermaid for constrained shapes, sanitized SVG for freeform.

**Pros**:
- Single source of truth across three surfaces.
- Vector art means tiny bytes on light phones.
- No new providers and no new env vars.

**Cons**:
- Two render paths to maintain.
- Model drawings can mislead before the caption is read.

### Option 2: Message parts only

Art lives inside chat message JSON; quiz and notes keep copies. No migration.

**Pros**:
- Smallest build, no schema change.

**Cons**:
- Copies drift; quiz and notes cannot share one object.
- Review after reload loses the link.

### Option 3: Raster image model

An image model paints pixels for every diagram.

**Pros**:
- Rich visuals with no renderer code.

**Cons**:
- Heavy bytes for the phones this product serves.
- New cost, new provider path, unproven in this stack.

### Option 4: Mermaid only

Every diagram as Mermaid source.

**Pros**:
- One renderer, reliable output.

**Cons**:
- Cannot express physics freeform: field arrows, rays, circuits.
- Wrong tool for the subject that motivated the feature.

## Rationale

The study loop needs one art object reachable from three surfaces, which rules out Option 2 at the data layer: copies cannot stay true across chat, quiz, and notes. Bytes and cost rule out Option 3 on the phones this product serves, and physics rules out Option 4 at the subject that motivated the feature. The hybrid keeps each renderer where it wins: Mermaid where shapes are constrained, SVG where the model must place arrows and labels freely, with sanitization neutralizing the script risk that comes with inline SVG. Reusing the scan pipeline and the Muse first routing holds new machinery to one table, two endpoints, and two client deps.

A note on scope: row 55 asked for chat plus quiz plus notes. The note reader already frames the PDF itself, so scans add nothing new there; the row earns its place in notes through drawn art plus jump to page. Share cards stay out because public access rules do not exist yet.
