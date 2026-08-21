# Reproduce the mechanical value

Generated from the candidate input manifest and the canonical mechanical-parameter record.
Do not edit by hand: run `npm run pack`.

- Generator: `python3 scripts/mechanical_model.py`
- Command: `python3 scripts/mechanical_model.py --parity-json`
- Parameter set: `q8wz42-1-literature-bounded-force-law-SD-04-v2`
- Model fingerprint: `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`
- Supported regime: 2000-2400 nm inclusive
- Runtime: Python >=3.12; Node 20.19.2; npm 11.5.2
- Comparison tolerance: 1e-9 pN force; 1e-9 nm extension
- Feature snapshot SHA-256: `93ddde035429517cd2448182717df2177ce82e75b0f64c650bd958ad805cddc5`
- Upstream feature-source SHA-256: `3902bcfe7ccefcfc2b7dd41faafe878229fa622223aff7f09b4667062c6d81c5`
- Reference sequence SHA-256: `9ac9f493ed92b65cc3c170bb4a20c9666f2de6cb99c223fe58d4027f1f24e8af`

## Pinned inputs

| Path | SHA-256 | Scope |
|---|---|---|
| `data/sarcomere.json` | `de959c99df017ab61760b0dae934e02dca2727e06b6c99cc9e56ae6815d30e0a` | candidate file bytes |
| `data/titin.json` | `7d060801a816aacd864e0c16c390154f0457b58a5881cf4caa620c2bf77fdca9` | candidate file bytes |
| `data/titin_sequence_features.json` | `93ddde035429517cd2448182717df2177ce82e75b0f64c650bd958ad805cddc5` | candidate file bytes |
| `data/structural_states.json` | `569713b992b5d3dbaa26af59afefab76a7f05763735c94b8fbef76408738cf9a` | candidate file bytes |
| `data/geometry_sources.json` | `060978ad60b8d3a36f0e13befaaa0070195d4852da16cdb0ae24a072bd36e6ff` | candidate file bytes |
| `data/geometry_strategy.json` | `7d9836233d05cec540fb67b6a908a20ac579b86c30f393865a1f0a3bbd900e0f` | candidate file bytes |
| `data/context_measurements.json` | `1a2aedd179ba16eb6cca150b7d114aeb382e1c2414dca8b52e906ae6ad9e42d7` | candidate file bytes |
| `data/domain_backbones.json` | `62ae7aea19d8ac5ae6e88e5ff41b283daefe2a5de61fb18840bb872ec8f71d82` | candidate file bytes |
| `data/mechanical_parameters.json` | `c7fbf33ce82469f1fc346526e58e84c7c5434ad2b926ed05c37d27c443414cc3` | candidate file bytes |

## Procedure

1. Verify every pinned input SHA-256 before running the generator.
2. Create the documented Python environment and install requirements.txt.
3. Run python3 scripts/mechanical_model.py --parity-json from the repository root.
4. Compare force and regional extension using the recorded absolute tolerances.
5. Treat not_evaluated force as null; never coerce it to zero.

The human execution and sign-off of this worksheet remains an SC-27 gate.
