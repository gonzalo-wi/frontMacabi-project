# Features

Domain logic lives under `features/` (API clients, hooks, types, and feature-specific UI). **`pages/`** are thin route shells: they compose layout, wire hooks, and render feature components. **`components/`** at the repo root holds shared, cross-feature UI (buttons, data displays, layout primitives) with no business rules tied to a single domain.
