# Voxel craft pass — 2026-09-23

Scope: improve the editable voxel artwork while preserving the first model as a control. This is a stylized grid-specific form pass, not a claim that the original image reconstruction pipeline has passed all gates.

Observed first-pass issues: dotted roof seams, flattened leaf masses, furniture too thin to read, tree clipped at the top of the comparison camera. Changes are declared in ../refinement-spec.json and implemented in ../refined.mjs.

The first refinement made the crown too rounded. A second form adjustment reduced the core volumes, increased twig/leaf clusters from 17 to 31 per crown, reduced each cluster radius to 0.18–0.30m, and restricted yellow patches. Canopy still reads as voxel clusters, not individual botanical leaves; that is a visible approximation. The camera target moved from 2m to 2.6m with a larger vertical span, applied equally to both views. Component views now isolate and frame the selected item, with an appropriate floor height for bench/planter previews.

Browser review: the roof now has continuous dark seams; bench armrests, seat rails and four legs are legible; the whole crown fits the overview. The opaque window and simple ground remain considerably simpler than the generated reference. The final form is improved relative to the first voxel version, not a demonstrated upper bound on voxel quality.

Deterministic validation: 12 tests passed, covering original model regression and crafted roof coverage/contact, tree/bench connectivity, furniture grounding/clearance, and file round-trips for both roof palettes and all phase boundaries. Connectivity is 26-neighbour voxel adjacency, not a physical load-bearing simulation. The public gallery and native runtime are not part of this test.

Measured data: 175,366 cells, 213,088 rendered surface triangles for the completed blue-green crafted model; original 175,647 cells, 217,524 triangles. No iPhone timing, heat or memory claim.
