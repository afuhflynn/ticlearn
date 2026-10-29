# 0027. Visual course page analysis: rationale

**Date**: 2026-10-29

## Context

TiCLearn lets students upload course notes as PDFs. The hackathon study loop needs to understand what is on each page visually, because many course concepts live in diagrams charts tables and illustrations that text extraction alone misses. Feature 51 (grounded question generation) and a later page referenced question answering agent both need per page visual descriptions with page references so they can ground answers in the right page. The visual analysis provider (Baseten Muse Spark Open) already exists from feature 49 and is used only when visual understanding is useful. The constraint is to avoid sending every page to Baseten, which would burn credits and time on text-only pages, and to keep Baseten costs off the student's credit balance.

## Options considered

### Option 1: pdf.js for page rendering plus low resolution page scan (chosen)

Render each page to a low resolution image with pdf.js, check the non text ratio to decide if the page is visual, then send flagged pages to Baseten. Store page images in Vercel Blob. Run the whole pipeline as an Inngest background job triggered by note upload.

**Pros**: pure JavaScript, no system dependencies, works on Vercel Functions; low resolution scan is cheap and needs no model call; Inngest matches the existing processNote pattern; Vercel Blob is already configured.

**Cons**: low resolution scan could miss small diagrams or misclassify dense text pages; pdf.js rendering quality varies by PDF; adds one more background job to operate.

### Option 2: pdf.js image extraction per page as the scan

Use pdf.js to list embedded image objects on each page; pages with embedded images are flagged visual and rendered at higher resolution for Baseten.

**Pros**: exact and cheap; no rendering needed for the scan decision; pages without embedded images are never rendered.

**Cons**: misses vector-drawn diagrams and tables that have no embedded image object; would fail to flag visuals drawn with PDF vector commands.

### Option 3: Send every page to Baseten and let Baseten decide

Skip the scan entirely; render every page and send every page image to Baseten, letting the model report whether a visual exists.

**Pros**: simplest pipeline, no scan logic to maintain; Baseten is the most accurate judge of whether a page has a visual.

**Cons**: burns Baseten credits on every page including text-only pages; slower and more expensive; contradicts the scope rule that only useful pages are sent.

## Rationale

The scan must be cheap because it runs on every uploaded page and must not burn Baseten credits on text-only pages. Option 2's embedded-image extraction is cheaper but misses vector-drawn diagrams and tables, which are common in course material, so it would under-detect visuals. Option 3 is accurate but sends every page to Baseten, violating the cost constraint. Option 1 strikes the best balance: the low resolution scan catches image-based and vector-based visuals alike at near-zero cost, and only flagged pages go to Baseten. Running as an Inngest job matches the existing processNote pattern, so the team already operates this stack. pdf.js was chosen over pdf-poppler because it needs no system package on Vercel Functions. Vercel Blob was chosen because the token is already documented in .env.example and it gives public URLs for page images. Baseten costs are routed through lib/ai/usage.ts with the flat XAF rate and logged separately from student credits, matching the existing hackathon usage accounting.
