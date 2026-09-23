# Density and runtime study — 2026-09-23

This is an isolated implementation/interaction study, not a pass of the unfinished img2threejs reconstruction workflow. Production walking data and the native bundle remain unchanged.

## Deterministic geometry

- 7.5cm: 144,042 occupied cells including terrain and vegetation; cafe + terrace 66,527. Exposed-face geometry 211,956 triangles; exact planar merge 105,998 triangles / 13,991,736 attribute bytes.
- 15cm: 25,074 occupied cells; cafe + terrace 11,773. Exposed-face geometry 50,236 triangles; exact planar merge 26,874 triangles / 3,547,368 attribute bytes.
- Five completed plots therefore contain 1,059,780 / 529,990 triangles at fine resolution, or 251,180 / 134,370 at coarse resolution, before the shared base, paths and resident models. Identical completed plots share geometry allocation; memory is NOT five independent unique UGC works.
- Coarsening preserves occupied features conservatively and votes materials at each stage. Roof coverage and temporary frame-to-wall transitions are tested. Thin furniture becomes chunky and window reflections become jagged; these are visible resolution tradeoffs, not art-directed final assets.

## Validation

`density.test.mjs`: five tests cover area/winding conservation, hidden chunk boundary faces, diagonal AO invalidation, bulk copy + symmetry + undo, corrupted imports, real model counts, glass, roof coverage, stage-preserving resampling and both density roundtrips.

The in-app browser initially reported a regular ~1,000ms frame cadence in a background surface. Those FPS numbers are not treated as a GPU/device performance result. Geometry reductions are deterministic measurements; iPhone frame rate, total memory, temperature and battery remain unmeasured.

The benchmark records page frame intervals, CPU mesh time, application time and worker roundtrip. A hidden document invalidates the run. Initial voxelization and density switching are excluded. Rotating the camera keeps static shadow maps cached; moving residents update their shadow at up to 10Hz. A running construction updates only its dirty chunks and keeps four completed buildings intact.

## Foreground browser measurement

After the browser surface became active, the fine + merged condition ran at 59.9 FPS in both rotation and construction, p95 interval 16.8ms, zero intervals over 50ms. Construction mesh generation p95 was 136.7ms on the Worker, roundtrip p95 307.4ms. Canvas backing size was 937 × 660. These are a short Windows in-app browser observation, not an iPhone guarantee or evidence of zero CPU/GPU cost. Worker latency is separate from the frame cadence; input acknowledgement can lag even when rotation remains smooth.

Fine without merging also recorded 59.9 FPS, p95 16.8ms and zero >50ms intervals in both stages; construction mesh p95 133.4ms / response p95 319.1ms. The short desktop run therefore demonstrates reduced triangles/attribute buffers, not improved capped frame rate or faster meshing. All four conditions use the new Worker + chunk update path; this is not a timing comparison against the old synchronous renderer.

Coarse without merging: 59.9 FPS, p95 16.8ms, zero >50ms intervals in both stages; construction mesh p95 66.7ms / roundtrip p95 112.3ms. Coarse grid reduces worker latency as well as geometry, at the visible cost of finer details.

Coarse with merging: 59.9 FPS, p95 16.8ms, zero >50ms intervals in both stages; construction mesh p95 68.3ms / roundtrip p95 101.2ms. These results were read from the benchmark UI after four successful daytime foreground runs. The first run's 937 × 660 backing size was directly inspected; subsequent sizes are recorded per run by the benchmark but were not independently retrieved before reload. Treat the timing values as observations, not a controlled device certification.

## Browser interaction checks

- Fine/coarse, merged/unmerged, single building and five-plot scene were displayed.
- Selected a 360-cell bounding volume on the roof; recoloured 140 occupied cells. Geometry updated four chunks in 28.4ms, 45ms roundtrip in that observed operation.
- Switched to fine and back to coarse: edit and undo history retained. Undo restored the original 13,798-triangle building geometry.
- Added a 3 × 3 brush on the roof: nine cells changed (six new), one chunk regenerated; undo restored the 11,773-cell building + terrace count.
- At 6,000 steps, the fifth plot shows its timber frame while the other four stay completed. Original comparison versions remain unchanged.
- Night visibly lights all five window sets and hides the twelve outdoor residents. No browser errors or warnings were reported in the final check.
- All 22 existing + new data/geometry tests pass. Frame timing, geometry counts, input response and memory figures are kept distinct.

## Scratch editor extension

Added a zero-cell scratch workspace at each density, independent from the reference model. The 4.8m square board is 32×32 / 64×64 cells. The board is only an authoring aid; it is neither editable voxel data nor part of the saved work.

Data tests now include blank startup, top/side placement commands, four-way state isolation (scratch/sample × two densities), undoable clear, brush/copy/symmetry clipping at a fixed physical bound, and blank-vs-legacy file validation. Eight density tests pass.

Browser checks: placed the first coarse cell on the empty board, stacked a second above it, added a third from its side; switched to fine (empty, 64×64) and placed one visibly smaller cell at the same zoom. Returned to coarse, cleared it, and undid the clear to recover its three cells. Selected two empty-board points and filled a 20-cell base. Tested the zoom controls and top view. Existing reference models are not cleared by these operations.

Multi-touch suppression and two-finger navigation are implemented but have not been tested on an actual iPhone. This extension does not add native touch/haptic integration, automatic persistence, or a connection to the published UGC gallery.


## Horizontal layer selection

Range operations now switch between a single numbered layer and the original 3D bounding volume. A translucent guide is drawn at the base of the selected layer. Ray picking intersects that plane before considering voxel surfaces, so tall cells cannot pull either endpoint onto a different height. Blank starts with single-layer selection; the reference building retains volume selection by default. The guide is excluded from saved voxel data.

Ten density tests pass, including fill/paint/erase/undo restricted to layer two with untouched cells above and below at both densities; negative coordinates, last-layer and out-of-board picks are covered. In the desktop browser, entered layer 2 directly, selected a 78-cell rectangle and filled a one-cell-thick floating slab with no base cells. Switched to volume selection and back, undid the fill, then switched to 7.5cm: the UI showed layer 2 at 7.5cm with an empty 64×64 workspace. Touch interaction on iPhone remains untested.
