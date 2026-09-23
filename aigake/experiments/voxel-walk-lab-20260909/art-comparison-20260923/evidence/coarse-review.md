# Native 15cm cafe — 2026-09-23

## Scope and counts

- A new cafe authored on an integer 15cm grid; no quantization of a finer model.
- Main body: 32 cells wide. Completed site: **10,914 cells**, including paving, foundations, structure, furniture and planters.
- Exact surface merging with existing vertex AO: **15,250 triangles**, **2,013,000 bytes** of geometry attributes. This is not total app/GPU memory.
- Coarse cells are created on demand. The 87,312-cell subdivision is only created if the author selects 7.5cm in the editor; it adds no detail by itself.
- This study remains outside the native app bundle. No walking saves, unlock state, or live towns were modified.

## Geometry and construction

`node --test coarse-cafe.test.mjs density.test.mjs`: **15 passed**.

The new tests verify every individual prefix of the full construction timeline: a newly shown cell touches the ground or an already supported neighbour. Each completed stage is connected to the ground. This is a connectivity check, not structural engineering or gravity simulation. Tests also check roof column coverage, unobstructed window faces, no centre mullions, entrance clearance, separated furniture legs, and file roundtrip with construction stages. The existing 11 editor/density tests also pass.

Design decisions: low gable roof with attached seams; closed side gables; small attic window; recessed front and side panes with perimeter frames; wooden door behind its frame; canopy above its header; two entrance treads; brick plinth; side-only terrace with four legs per table/chair; three small planters. Chimney cap has an inset dark flue rather than a solid block protruding from its top.

## Browser checks

- Desktop and **390 × 844** browser viewport: complete model fits; main controls and the construction timeline are usable without horizontal overflow.
- Front three-quarter, rear and nighttime views inspected. Frame depth, table/chair legs, entrance passage, chimney and roof silhouette remain readable. No opaque pane-covering wall or roof gap observed.
- 6,000-step skeleton inspected. Playback from 0 to 20,000 steps completed and returned to the completed state.
- Previous resampled 15cm model loads from the comparison toggle using the same renderer, lighting and camera. The two models have different shapes/site extents, so their triangle counts are not a controlled performance comparison.
- Editor loads the new 10,914-cell model, switches to the 87,312-cell subdivision, and returns to the original coarse model. A one-cell recolour changed one cell and updated one mesh chunk; undo restored the original triangle count and exhausted the test edit history.
- Showcase and editor console warning/error lists were empty.

No physical iPhone, thermal, battery, GPU timing, or five-distinct-buildings benchmark performed. Mobile checks are browser viewport checks, not a claim of device performance. Reference image fidelity was not scored: this is a new grid-first design.
