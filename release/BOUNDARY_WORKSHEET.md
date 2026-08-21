# Sequence-boundary verification worksheet

Generated from the checksum-pinned candidate sequence-feature record for independent SC-27 execution.
Do not edit by hand: run `npm run pack`.

- Accession / isoform: Q8WZ42 / Q8WZ42-1
- Construct: Human TTN reference sequence · Q8WZ42-1
- Coordinate frame: canonical
- Reference length: 34350 aa
- Domain features: 285
- Candidate source: `data/titin_sequence_features.json`
- Candidate SHA-256: `93ddde035429517cd2448182717df2177ce82e75b0f64c650bd958ad805cddc5`
- Upstream SHA-256: `3902bcfe7ccefcfc2b7dd41faafe878229fa622223aff7f09b4667062c6d81c5`
- Reference sequence SHA-256: `9ac9f493ed92b65cc3c170bb4a20c9666f2de6cb99c223fe58d4027f1f24e8af`
- Source release: 2026_02
- Validation command: `python3 scripts/validate_sequence_features.py`

## Procedure

1. Verify the candidate feature-file SHA-256 before reviewing boundaries.
2. Run python3 scripts/validate_sequence_features.py from the repository root.
3. Confirm every displayed region is contiguous and every contained feature lies wholly inside its inclusive interval.
4. Record any unassigned, multiply assigned, or boundary-crossing feature as a finding; do not repair it by eye.

## Region partition

| Region | Inclusive residues | Length (aa) | Contained domain features |
|---|---:|---:|---:|
| `Z1Z2` | 1-800 | 800 | 2 |
| `prox_Ig` | 801-9365 | 8565 | 74 |
| `N2A` | 9366-9851 | 486 | 3 |
| `post_N2A_unknown` | 9852-10215 | 364 | 0 |
| `PEVK` | 10216-12022 | 1807 | 0 |
| `dist_Ig` | 12023-14018 | 1996 | 16 |
| `Aband_super` | 14019-32177 | 18159 | 179 |
| `kinase` | 32178-32432 | 255 | 1 |
| `Mline` | 32433-34350 | 1918 | 10 |

Automated boundary findings: none.

## Exact contained features by region

### Z-disc anchor (Z1-Z2 Ig + Z-repeats) (`Z1Z2`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Ig-like-1:6-96` | Ig-like 1 | DOMAIN | 6-96 | 91 |
| `DOMAIN:Ig-like-2:104-192` | Ig-like 2 | DOMAIN | 104-192 | 89 |

### Proximal tandem Ig (I-band) (`prox_Ig`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Ig-like-3:943-1031` | Ig-like 3 | DOMAIN | 943-1031 | 89 |
| `DOMAIN:Ig-like-4:1082-1172` | Ig-like 4 | DOMAIN | 1082-1172 | 91 |
| `DOMAIN:Ig-like-5:1291-1382` | Ig-like 5 | DOMAIN | 1291-1382 | 92 |
| `DOMAIN:Ig-like-6:1457-1546` | Ig-like 6 | DOMAIN | 1457-1546 | 90 |
| `DOMAIN:Ig-like-7:1556-1646` | Ig-like 7 | DOMAIN | 1556-1646 | 91 |
| `DOMAIN:Ig-like-8:1703-1793` | Ig-like 8 | DOMAIN | 1703-1793 | 91 |
| `DOMAIN:Ig-like-9:1841-1928` | Ig-like 9 | DOMAIN | 1841-1928 | 88 |
| `DOMAIN:Ig-like-10:2078-2167` | Ig-like 10 | DOMAIN | 2078-2167 | 90 |
| `DOMAIN:Ig-like-11:2171-2262` | Ig-like 11 | DOMAIN | 2171-2262 | 92 |
| `DOMAIN:Ig-like-12:2264-2354` | Ig-like 12 | DOMAIN | 2264-2354 | 91 |
| `DOMAIN:Ig-like-13:2353-2443` | Ig-like 13 | DOMAIN | 2353-2443 | 91 |
| `DOMAIN:Ig-like-14:2430-2529` | Ig-like 14 | DOMAIN | 2430-2529 | 100 |
| `DOMAIN:Ig-like-15:2620-2703` | Ig-like 15 | DOMAIN | 2620-2703 | 84 |
| `DOMAIN:Ig-like-16:2880-2965` | Ig-like 16 | DOMAIN | 2880-2965 | 86 |
| `DOMAIN:Ig-like-17:2968-3050` | Ig-like 17 | DOMAIN | 2968-3050 | 83 |
| `DOMAIN:Ig-like-18:3058-3141` | Ig-like 18 | DOMAIN | 3058-3141 | 84 |
| `DOMAIN:Ig-like-19:3239-3327` | Ig-like 19 | DOMAIN | 3239-3327 | 89 |
| `DOMAIN:Ig-like-20:3344-3432` | Ig-like 20 | DOMAIN | 3344-3432 | 89 |
| `DOMAIN:Ig-like-21:3503-3586` | Ig-like 21 | DOMAIN | 3503-3586 | 84 |
| `DOMAIN:Ig-like-22:3621-3712` | Ig-like 22 | DOMAIN | 3621-3712 | 92 |
| `DOMAIN:Ig-like-23:4289-4376` | Ig-like 23 | DOMAIN | 4289-4376 | 88 |
| `DOMAIN:Ig-like-24:4383-4471` | Ig-like 24 | DOMAIN | 4383-4471 | 89 |
| `DOMAIN:Ig-like-25:4478-4566` | Ig-like 25 | DOMAIN | 4478-4566 | 89 |
| `DOMAIN:Ig-like-26:4571-4659` | Ig-like 26 | DOMAIN | 4571-4659 | 89 |
| `DOMAIN:Ig-like-27:4664-4753` | Ig-like 27 | DOMAIN | 4664-4753 | 90 |
| `DOMAIN:Ig-like-28:4758-4846` | Ig-like 28 | DOMAIN | 4758-4846 | 89 |
| `DOMAIN:Ig-like-29:4851-4936` | Ig-like 29 | DOMAIN | 4851-4936 | 86 |
| `DOMAIN:Ig-like-30:4943-5032` | Ig-like 30 | DOMAIN | 4943-5032 | 90 |
| `DOMAIN:Ig-like-31:5040-5128` | Ig-like 31 | DOMAIN | 5040-5128 | 89 |
| `DOMAIN:Ig-like-32:5133-5221` | Ig-like 32 | DOMAIN | 5133-5221 | 89 |
| `DOMAIN:Ig-like-33:5225-5314` | Ig-like 33 | DOMAIN | 5225-5314 | 90 |
| `DOMAIN:Ig-like-34:5320-5408` | Ig-like 34 | DOMAIN | 5320-5408 | 89 |
| `DOMAIN:Ig-like-35:5413-5501` | Ig-like 35 | DOMAIN | 5413-5501 | 89 |
| `DOMAIN:Ig-like-36:5505-5594` | Ig-like 36 | DOMAIN | 5505-5594 | 90 |
| `DOMAIN:Ig-like-37:5602-5690` | Ig-like 37 | DOMAIN | 5602-5690 | 89 |
| `DOMAIN:Ig-like-38:5695-5783` | Ig-like 38 | DOMAIN | 5695-5783 | 89 |
| `DOMAIN:Ig-like-39:5788-5877` | Ig-like 39 | DOMAIN | 5788-5877 | 90 |
| `DOMAIN:Ig-like-40:5882-5970` | Ig-like 40 | DOMAIN | 5882-5970 | 89 |
| `DOMAIN:Ig-like-41:5975-6063` | Ig-like 41 | DOMAIN | 5975-6063 | 89 |
| `DOMAIN:Ig-like-42:6067-6156` | Ig-like 42 | DOMAIN | 6067-6156 | 90 |
| `DOMAIN:Ig-like-43:6164-6252` | Ig-like 43 | DOMAIN | 6164-6252 | 89 |
| `DOMAIN:Ig-like-44:6257-6347` | Ig-like 44 | DOMAIN | 6257-6347 | 91 |
| `DOMAIN:Ig-like-45:6350-6440` | Ig-like 45 | DOMAIN | 6350-6440 | 91 |
| `DOMAIN:Ig-like-46:6444-6534` | Ig-like 46 | DOMAIN | 6444-6534 | 91 |
| `DOMAIN:Ig-like-47:6537-6626` | Ig-like 47 | DOMAIN | 6537-6626 | 90 |
| `DOMAIN:Ig-like-48:6630-6721` | Ig-like 48 | DOMAIN | 6630-6721 | 92 |
| `DOMAIN:Ig-like-49:6727-6815` | Ig-like 49 | DOMAIN | 6727-6815 | 89 |
| `DOMAIN:Ig-like-50:6820-6908` | Ig-like 50 | DOMAIN | 6820-6908 | 89 |
| `DOMAIN:Ig-like-51:6912-7001` | Ig-like 51 | DOMAIN | 6912-7001 | 90 |
| `DOMAIN:Ig-like-52:7005-7093` | Ig-like 52 | DOMAIN | 7005-7093 | 89 |
| `DOMAIN:Ig-like-53:7102-7190` | Ig-like 53 | DOMAIN | 7102-7190 | 89 |
| `DOMAIN:Ig-like-54:7198-7286` | Ig-like 54 | DOMAIN | 7198-7286 | 89 |
| `DOMAIN:Ig-like-55:7291-7380` | Ig-like 55 | DOMAIN | 7291-7380 | 90 |
| `DOMAIN:Ig-like-56:7385-7473` | Ig-like 56 | DOMAIN | 7385-7473 | 89 |
| `DOMAIN:Ig-like-57:7478-7567` | Ig-like 57 | DOMAIN | 7478-7567 | 90 |
| `DOMAIN:Ig-like-58:7571-7662` | Ig-like 58 | DOMAIN | 7571-7662 | 92 |
| `DOMAIN:Ig-like-59:7668-7756` | Ig-like 59 | DOMAIN | 7668-7756 | 89 |
| `DOMAIN:Ig-like-60:7761-7849` | Ig-like 60 | DOMAIN | 7761-7849 | 89 |
| `DOMAIN:Ig-like-61:7853-7942` | Ig-like 61 | DOMAIN | 7853-7942 | 90 |
| `DOMAIN:Ig-like-62:7946-8035` | Ig-like 62 | DOMAIN | 7946-8035 | 90 |
| `DOMAIN:Ig-like-63:8042-8133` | Ig-like 63 | DOMAIN | 8042-8133 | 92 |
| `DOMAIN:Ig-like-64:8138-8229` | Ig-like 64 | DOMAIN | 8138-8229 | 92 |
| `DOMAIN:Ig-like-65:8232-8321` | Ig-like 65 | DOMAIN | 8232-8321 | 90 |
| `DOMAIN:Ig-like-66:8326-8414` | Ig-like 66 | DOMAIN | 8326-8414 | 89 |
| `DOMAIN:Ig-like-67:8419-8508` | Ig-like 67 | DOMAIN | 8419-8508 | 90 |
| `DOMAIN:Ig-like-68:8512-8603` | Ig-like 68 | DOMAIN | 8512-8603 | 92 |
| `DOMAIN:Ig-like-69:8609-8697` | Ig-like 69 | DOMAIN | 8609-8697 | 89 |
| `DOMAIN:Ig-like-70:8702-8790` | Ig-like 70 | DOMAIN | 8702-8790 | 89 |
| `DOMAIN:Ig-like-71:8794-8883` | Ig-like 71 | DOMAIN | 8794-8883 | 90 |
| `DOMAIN:Ig-like-72:8888-8976` | Ig-like 72 | DOMAIN | 8888-8976 | 89 |
| `DOMAIN:Ig-like-73:8984-9074` | Ig-like 73 | DOMAIN | 8984-9074 | 91 |
| `DOMAIN:Ig-like-74:9079-9168` | Ig-like 74 | DOMAIN | 9079-9168 | 90 |
| `DOMAIN:Ig-like-75:9176-9265` | Ig-like 75 | DOMAIN | 9176-9265 | 90 |
| `DOMAIN:Ig-like-76:9272-9361` | Ig-like 76 | DOMAIN | 9272-9361 | 90 |

### N2A I80-UN2A-I81-I82-I83 signaling element (`N2A`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Ig-like-77:9366-9470` | Ig-like 77 | DOMAIN | 9366-9470 | 105 |
| `DOMAIN:Ig-like-78:9660-9755` | Ig-like 78 | DOMAIN | 9660-9755 | 96 |
| `DOMAIN:Ig-like-79:9760-9851` | Ig-like 79 | DOMAIN | 9760-9851 | 92 |

### Post-N2A unadjudicated sequence interval (`post_N2A_unknown`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| — | No wholly contained DOMAIN feature | — | — | — |

### PEVK entropic spring (`PEVK`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| — | No wholly contained DOMAIN feature | — | — | — |

### Distal tandem Ig (I-band) (`dist_Ig`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Ig-like-80:12041-12133` | Ig-like 80 | DOMAIN | 12041-12133 | 93 |
| `DOMAIN:Ig-like-81:12138-12222` | Ig-like 81 | DOMAIN | 12138-12222 | 85 |
| `DOMAIN:Ig-like-82:12233-12318` | Ig-like 82 | DOMAIN | 12233-12318 | 86 |
| `DOMAIN:Ig-like-83:12499-12584` | Ig-like 83 | DOMAIN | 12499-12584 | 86 |
| `DOMAIN:Ig-like-84:12590-12672` | Ig-like 84 | DOMAIN | 12590-12672 | 83 |
| `DOMAIN:Ig-like-85:12766-12850` | Ig-like 85 | DOMAIN | 12766-12850 | 85 |
| `DOMAIN:Ig-like-86:12945-13032` | Ig-like 86 | DOMAIN | 12945-13032 | 88 |
| `DOMAIN:Ig-like-87:13120-13206` | Ig-like 87 | DOMAIN | 13120-13206 | 87 |
| `DOMAIN:Ig-like-88:13210-13295` | Ig-like 88 | DOMAIN | 13210-13295 | 86 |
| `DOMAIN:Ig-like-89:13299-13384` | Ig-like 89 | DOMAIN | 13299-13384 | 86 |
| `DOMAIN:Ig-like-90:13388-13478` | Ig-like 90 | DOMAIN | 13388-13478 | 91 |
| `DOMAIN:Ig-like-91:13479-13562` | Ig-like 91 | DOMAIN | 13479-13562 | 84 |
| `DOMAIN:Ig-like-92:13565-13655` | Ig-like 92 | DOMAIN | 13565-13655 | 91 |
| `DOMAIN:Ig-like-93:13659-13748` | Ig-like 93 | DOMAIN | 13659-13748 | 90 |
| `DOMAIN:Ig-like-94:13749-13833` | Ig-like 94 | DOMAIN | 13749-13833 | 85 |
| `DOMAIN:Ig-like-95:13927-14012` | Ig-like 95 | DOMAIN | 13927-14012 | 86 |

### A-band bound Ig-Fn3 path (`Aband_super`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Fibronectin-type-III-1:14019-14114` | Fibronectin type-III 1 | DOMAIN | 14019-14114 | 96 |
| `DOMAIN:Fibronectin-type-III-2:14120-14215` | Fibronectin type-III 2 | DOMAIN | 14120-14215 | 96 |
| `DOMAIN:Fibronectin-type-III-3:14221-14316` | Fibronectin type-III 3 | DOMAIN | 14221-14316 | 96 |
| `DOMAIN:Fibronectin-type-III-4:14417-14513` | Fibronectin type-III 4 | DOMAIN | 14417-14513 | 97 |
| `DOMAIN:Fibronectin-type-III-5:14517-14614` | Fibronectin type-III 5 | DOMAIN | 14517-14614 | 98 |
| `DOMAIN:Ig-like-96:14615-14708` | Ig-like 96 | DOMAIN | 14615-14708 | 94 |
| `DOMAIN:Fibronectin-type-III-6:14713-14806` | Fibronectin type-III 6 | DOMAIN | 14713-14806 | 94 |
| `DOMAIN:Fibronectin-type-III-7:14812-14907` | Fibronectin type-III 7 | DOMAIN | 14812-14907 | 96 |
| `DOMAIN:Fibronectin-type-III-8:14913-15007` | Fibronectin type-III 8 | DOMAIN | 14913-15007 | 95 |
| `DOMAIN:Fibronectin-type-III-9:15010-15107` | Fibronectin type-III 9 | DOMAIN | 15010-15107 | 98 |
| `DOMAIN:Fibronectin-type-III-10:15113-15207` | Fibronectin type-III 10 | DOMAIN | 15113-15207 | 95 |
| `DOMAIN:Fibronectin-type-III-11:15214-15310` | Fibronectin type-III 11 | DOMAIN | 15214-15310 | 97 |
| `DOMAIN:Ig-like-97:15314-15402` | Ig-like 97 | DOMAIN | 15314-15402 | 89 |
| `DOMAIN:Fibronectin-type-III-12:15409-15503` | Fibronectin type-III 12 | DOMAIN | 15409-15503 | 95 |
| `DOMAIN:Fibronectin-type-III-13:15509-15604` | Fibronectin type-III 13 | DOMAIN | 15509-15604 | 96 |
| `DOMAIN:Ig-like-98:15608-15724` | Ig-like 98 | DOMAIN | 15608-15724 | 117 |
| `DOMAIN:Fibronectin-type-III-14:15731-15826` | Fibronectin type-III 14 | DOMAIN | 15731-15826 | 96 |
| `DOMAIN:Fibronectin-type-III-15:15832-15926` | Fibronectin type-III 15 | DOMAIN | 15832-15926 | 95 |
| `DOMAIN:Fibronectin-type-III-16:15929-16025` | Fibronectin type-III 16 | DOMAIN | 15929-16025 | 97 |
| `DOMAIN:Ig-like-99:16029-16119` | Ig-like 99 | DOMAIN | 16029-16119 | 91 |
| `DOMAIN:Fibronectin-type-III-17:16126-16218` | Fibronectin type-III 17 | DOMAIN | 16126-16218 | 93 |
| `DOMAIN:Fibronectin-type-III-18:16224-16318` | Fibronectin type-III 18 | DOMAIN | 16224-16318 | 95 |
| `DOMAIN:Ig-like-100:16322-16420` | Ig-like 100 | DOMAIN | 16322-16420 | 99 |
| `DOMAIN:Fibronectin-type-III-19:16427-16522` | Fibronectin type-III 19 | DOMAIN | 16427-16522 | 96 |
| `DOMAIN:Fibronectin-type-III-20:16528-16628` | Fibronectin type-III 20 | DOMAIN | 16528-16628 | 101 |
| `DOMAIN:Fibronectin-type-III-21:16634-16734` | Fibronectin type-III 21 | DOMAIN | 16634-16734 | 101 |
| `DOMAIN:Ig-like-101:16727-16834` | Ig-like 101 | DOMAIN | 16727-16834 | 108 |
| `DOMAIN:Fibronectin-type-III-22:16841-16934` | Fibronectin type-III 22 | DOMAIN | 16841-16934 | 94 |
| `DOMAIN:Fibronectin-type-III-23:16941-17041` | Fibronectin type-III 23 | DOMAIN | 16941-17041 | 101 |
| `DOMAIN:Ig-like-102:17044-17139` | Ig-like 102 | DOMAIN | 17044-17139 | 96 |
| `DOMAIN:Fibronectin-type-III-24:17147-17240` | Fibronectin type-III 24 | DOMAIN | 17147-17240 | 94 |
| `DOMAIN:Fibronectin-type-III-25:17246-17345` | Fibronectin type-III 25 | DOMAIN | 17246-17345 | 100 |
| `DOMAIN:Fibronectin-type-III-26:17348-17445` | Fibronectin type-III 26 | DOMAIN | 17348-17445 | 98 |
| `DOMAIN:Ig-like-103:17449-17536` | Ig-like 103 | DOMAIN | 17449-17536 | 88 |
| `DOMAIN:Fibronectin-type-III-27:17545-17640` | Fibronectin type-III 27 | DOMAIN | 17545-17640 | 96 |
| `DOMAIN:Fibronectin-type-III-28:17646-17741` | Fibronectin type-III 28 | DOMAIN | 17646-17741 | 96 |
| `DOMAIN:Ig-like-104:17745-17834` | Ig-like 104 | DOMAIN | 17745-17834 | 90 |
| `DOMAIN:Fibronectin-type-III-29:17842-17935` | Fibronectin type-III 29 | DOMAIN | 17842-17935 | 94 |
| `DOMAIN:Fibronectin-type-III-30:17941-18036` | Fibronectin type-III 30 | DOMAIN | 17941-18036 | 96 |
| `DOMAIN:Fibronectin-type-III-31:18042-18139` | Fibronectin type-III 31 | DOMAIN | 18042-18139 | 98 |
| `DOMAIN:Ig-like-105:18143-18228` | Ig-like 105 | DOMAIN | 18143-18228 | 86 |
| `DOMAIN:Fibronectin-type-III-32:18239-18333` | Fibronectin type-III 32 | DOMAIN | 18239-18333 | 95 |
| `DOMAIN:Fibronectin-type-III-33:18339-18431` | Fibronectin type-III 33 | DOMAIN | 18339-18431 | 93 |
| `DOMAIN:Ig-like-106:18435-18526` | Ig-like 106 | DOMAIN | 18435-18526 | 92 |
| `DOMAIN:Fibronectin-type-III-34:18533-18632` | Fibronectin type-III 34 | DOMAIN | 18533-18632 | 100 |
| `DOMAIN:Fibronectin-type-III-35:18633-18727` | Fibronectin type-III 35 | DOMAIN | 18633-18727 | 95 |
| `DOMAIN:Fibronectin-type-III-36:18733-18829` | Fibronectin type-III 36 | DOMAIN | 18733-18829 | 97 |
| `DOMAIN:Ig-like-107:18833-18924` | Ig-like 107 | DOMAIN | 18833-18924 | 92 |
| `DOMAIN:Fibronectin-type-III-37:18931-19025` | Fibronectin type-III 37 | DOMAIN | 18931-19025 | 95 |
| `DOMAIN:Fibronectin-type-III-38:19030-19124` | Fibronectin type-III 38 | DOMAIN | 19030-19124 | 95 |
| `DOMAIN:Ig-like-108:19128-19219` | Ig-like 108 | DOMAIN | 19128-19219 | 92 |
| `DOMAIN:Fibronectin-type-III-39:19226-19321` | Fibronectin type-III 39 | DOMAIN | 19226-19321 | 96 |
| `DOMAIN:Fibronectin-type-III-40:19325-19420` | Fibronectin type-III 40 | DOMAIN | 19325-19420 | 96 |
| `DOMAIN:Fibronectin-type-III-41:19426-19527` | Fibronectin type-III 41 | DOMAIN | 19426-19527 | 102 |
| `DOMAIN:Ig-like-109:19531-19617` | Ig-like 109 | DOMAIN | 19531-19617 | 87 |
| `DOMAIN:Fibronectin-type-III-42:19628-19722` | Fibronectin type-III 42 | DOMAIN | 19628-19722 | 95 |
| `DOMAIN:Fibronectin-type-III-43:19728-19823` | Fibronectin type-III 43 | DOMAIN | 19728-19823 | 96 |
| `DOMAIN:Ig-like-110:19826-19914` | Ig-like 110 | DOMAIN | 19826-19914 | 89 |
| `DOMAIN:Fibronectin-type-III-44:19921-20017` | Fibronectin type-III 44 | DOMAIN | 19921-20017 | 97 |
| `DOMAIN:Fibronectin-type-III-45:20018-20116` | Fibronectin type-III 45 | DOMAIN | 20018-20116 | 99 |
| `DOMAIN:Fibronectin-type-III-46:20119-20217` | Fibronectin type-III 46 | DOMAIN | 20119-20217 | 99 |
| `DOMAIN:Ig-like-111:20220-20311` | Ig-like 111 | DOMAIN | 20220-20311 | 92 |
| `DOMAIN:Fibronectin-type-III-47:20318-20411` | Fibronectin type-III 47 | DOMAIN | 20318-20411 | 94 |
| `DOMAIN:Fibronectin-type-III-48:20417-20512` | Fibronectin type-III 48 | DOMAIN | 20417-20512 | 96 |
| `DOMAIN:Fibronectin-type-III-49:20518-20613` | Fibronectin type-III 49 | DOMAIN | 20518-20613 | 96 |
| `DOMAIN:Fibronectin-type-III-50:20716-20813` | Fibronectin type-III 50 | DOMAIN | 20716-20813 | 98 |
| `DOMAIN:Fibronectin-type-III-51:20814-20908` | Fibronectin type-III 51 | DOMAIN | 20814-20908 | 95 |
| `DOMAIN:Ig-like-112:20893-20996` | Ig-like 112 | DOMAIN | 20893-20996 | 104 |
| `DOMAIN:Fibronectin-type-III-52:21006-21101` | Fibronectin type-III 52 | DOMAIN | 21006-21101 | 96 |
| `DOMAIN:Fibronectin-type-III-53:21105-21200` | Fibronectin type-III 53 | DOMAIN | 21105-21200 | 96 |
| `DOMAIN:Fibronectin-type-III-54:21203-21299` | Fibronectin type-III 54 | DOMAIN | 21203-21299 | 97 |
| `DOMAIN:Ig-like-113:21303-21395` | Ig-like 113 | DOMAIN | 21303-21395 | 93 |
| `DOMAIN:Fibronectin-type-III-55:21402-21495` | Fibronectin type-III 55 | DOMAIN | 21402-21495 | 94 |
| `DOMAIN:Fibronectin-type-III-56:21501-21596` | Fibronectin type-III 56 | DOMAIN | 21501-21596 | 96 |
| `DOMAIN:Fibronectin-type-III-57:21602-21697` | Fibronectin type-III 57 | DOMAIN | 21602-21697 | 96 |
| `DOMAIN:Ig-like-114:21701-21793` | Ig-like 114 | DOMAIN | 21701-21793 | 93 |
| `DOMAIN:Fibronectin-type-III-58:21797-21891` | Fibronectin type-III 58 | DOMAIN | 21797-21891 | 95 |
| `DOMAIN:Fibronectin-type-III-59:21894-21986` | Fibronectin type-III 59 | DOMAIN | 21894-21986 | 93 |
| `DOMAIN:Ig-like-115:21990-22083` | Ig-like 115 | DOMAIN | 21990-22083 | 94 |
| `DOMAIN:Fibronectin-type-III-60:22088-22182` | Fibronectin type-III 60 | DOMAIN | 22088-22182 | 95 |
| `DOMAIN:Fibronectin-type-III-61:22188-22283` | Fibronectin type-III 61 | DOMAIN | 22188-22283 | 96 |
| `DOMAIN:Fibronectin-type-III-62:22286-22382` | Fibronectin type-III 62 | DOMAIN | 22286-22382 | 97 |
| `DOMAIN:Ig-like-116:22386-22477` | Ig-like 116 | DOMAIN | 22386-22477 | 92 |
| `DOMAIN:Fibronectin-type-III-63:22484-22578` | Fibronectin type-III 63 | DOMAIN | 22484-22578 | 95 |
| `DOMAIN:Fibronectin-type-III-64:22584-22679` | Fibronectin type-III 64 | DOMAIN | 22584-22679 | 96 |
| `DOMAIN:Fibronectin-type-III-65:22685-22781` | Fibronectin type-III 65 | DOMAIN | 22685-22781 | 97 |
| `DOMAIN:Ig-like-117:22785-22874` | Ig-like 117 | DOMAIN | 22785-22874 | 90 |
| `DOMAIN:Fibronectin-type-III-66:22881-22976` | Fibronectin type-III 66 | DOMAIN | 22881-22976 | 96 |
| `DOMAIN:Fibronectin-type-III-67:22978-23071` | Fibronectin type-III 67 | DOMAIN | 22978-23071 | 94 |
| `DOMAIN:Ig-like-118:23075-23163` | Ig-like 118 | DOMAIN | 23075-23163 | 89 |
| `DOMAIN:Fibronectin-type-III-68:23170-23264` | Fibronectin type-III 68 | DOMAIN | 23170-23264 | 95 |
| `DOMAIN:Fibronectin-type-III-69:23270-23364` | Fibronectin type-III 69 | DOMAIN | 23270-23364 | 95 |
| `DOMAIN:Fibronectin-type-III-70:23368-23463` | Fibronectin type-III 70 | DOMAIN | 23368-23463 | 96 |
| `DOMAIN:Ig-like-119:23468-23555` | Ig-like 119 | DOMAIN | 23468-23555 | 88 |
| `DOMAIN:Fibronectin-type-III-71:23566-23660` | Fibronectin type-III 71 | DOMAIN | 23566-23660 | 95 |
| `DOMAIN:Fibronectin-type-III-72:23666-23761` | Fibronectin type-III 72 | DOMAIN | 23666-23761 | 96 |
| `DOMAIN:Fibronectin-type-III-73:23767-23863` | Fibronectin type-III 73 | DOMAIN | 23767-23863 | 97 |
| `DOMAIN:Ig-like-120:23867-23954` | Ig-like 120 | DOMAIN | 23867-23954 | 88 |
| `DOMAIN:Fibronectin-type-III-74:23963-24057` | Fibronectin type-III 74 | DOMAIN | 23963-24057 | 95 |
| `DOMAIN:Fibronectin-type-III-75:24060-24153` | Fibronectin type-III 75 | DOMAIN | 24060-24153 | 94 |
| `DOMAIN:Ig-like-121:24157-24241` | Ig-like 121 | DOMAIN | 24157-24241 | 85 |
| `DOMAIN:Fibronectin-type-III-76:24252-24346` | Fibronectin type-III 76 | DOMAIN | 24252-24346 | 95 |
| `DOMAIN:Fibronectin-type-III-77:24352-24446` | Fibronectin type-III 77 | DOMAIN | 24352-24446 | 95 |
| `DOMAIN:Fibronectin-type-III-78:24450-24546` | Fibronectin type-III 78 | DOMAIN | 24450-24546 | 97 |
| `DOMAIN:Ig-like-122:24550-24641` | Ig-like 122 | DOMAIN | 24550-24641 | 92 |
| `DOMAIN:Fibronectin-type-III-79:24648-24742` | Fibronectin type-III 79 | DOMAIN | 24648-24742 | 95 |
| `DOMAIN:Fibronectin-type-III-80:24748-24843` | Fibronectin type-III 80 | DOMAIN | 24748-24843 | 96 |
| `DOMAIN:Fibronectin-type-III-81:24849-24945` | Fibronectin type-III 81 | DOMAIN | 24849-24945 | 97 |
| `DOMAIN:Ig-like-123:24949-25038` | Ig-like 123 | DOMAIN | 24949-25038 | 90 |
| `DOMAIN:Fibronectin-type-III-82:25045-25139` | Fibronectin type-III 82 | DOMAIN | 25045-25139 | 95 |
| `DOMAIN:Fibronectin-type-III-83:25142-25235` | Fibronectin type-III 83 | DOMAIN | 25142-25235 | 94 |
| `DOMAIN:Ig-like-124:25239-25325` | Ig-like 124 | DOMAIN | 25239-25325 | 87 |
| `DOMAIN:Fibronectin-type-III-84:25335-25428` | Fibronectin type-III 84 | DOMAIN | 25335-25428 | 94 |
| `DOMAIN:Fibronectin-type-III-85:25434-25529` | Fibronectin type-III 85 | DOMAIN | 25434-25529 | 96 |
| `DOMAIN:Fibronectin-type-III-86:25532-25627` | Fibronectin type-III 86 | DOMAIN | 25532-25627 | 96 |
| `DOMAIN:Ig-like-125:25632-25722` | Ig-like 125 | DOMAIN | 25632-25722 | 91 |
| `DOMAIN:Fibronectin-type-III-87:25731-25825` | Fibronectin type-III 87 | DOMAIN | 25731-25825 | 95 |
| `DOMAIN:Fibronectin-type-III-88:25831-25926` | Fibronectin type-III 88 | DOMAIN | 25831-25926 | 96 |
| `DOMAIN:Fibronectin-type-III-89:25932-26028` | Fibronectin type-III 89 | DOMAIN | 25932-26028 | 97 |
| `DOMAIN:Ig-like-126:26032-26121` | Ig-like 126 | DOMAIN | 26032-26121 | 90 |
| `DOMAIN:Fibronectin-type-III-90:26128-26222` | Fibronectin type-III 90 | DOMAIN | 26128-26222 | 95 |
| `DOMAIN:Fibronectin-type-III-91:26225-26318` | Fibronectin type-III 91 | DOMAIN | 26225-26318 | 94 |
| `DOMAIN:Ig-like-127:26322-26410` | Ig-like 127 | DOMAIN | 26322-26410 | 89 |
| `DOMAIN:Fibronectin-type-III-92:26417-26510` | Fibronectin type-III 92 | DOMAIN | 26417-26510 | 94 |
| `DOMAIN:Fibronectin-type-III-93:26516-26611` | Fibronectin type-III 93 | DOMAIN | 26516-26611 | 96 |
| `DOMAIN:Fibronectin-type-III-94:26614-26710` | Fibronectin type-III 94 | DOMAIN | 26614-26710 | 97 |
| `DOMAIN:Ig-like-128:26714-26801` | Ig-like 128 | DOMAIN | 26714-26801 | 88 |
| `DOMAIN:Fibronectin-type-III-95:26812-26906` | Fibronectin type-III 95 | DOMAIN | 26812-26906 | 95 |
| `DOMAIN:Fibronectin-type-III-96:26912-27007` | Fibronectin type-III 96 | DOMAIN | 26912-27007 | 96 |
| `DOMAIN:Fibronectin-type-III-97:27013-27107` | Fibronectin type-III 97 | DOMAIN | 27013-27107 | 95 |
| `DOMAIN:Ig-like-129:27101-27196` | Ig-like 129 | DOMAIN | 27101-27196 | 96 |
| `DOMAIN:Fibronectin-type-III-98:27205-27296` | Fibronectin type-III 98 | DOMAIN | 27205-27296 | 92 |
| `DOMAIN:Fibronectin-type-III-99:27302-27392` | Fibronectin type-III 99 | DOMAIN | 27302-27392 | 91 |
| `DOMAIN:Fibronectin-type-III-100:27499-27593` | Fibronectin type-III 100 | DOMAIN | 27499-27593 | 95 |
| `DOMAIN:Fibronectin-type-III-101:27599-27694` | Fibronectin type-III 101 | DOMAIN | 27599-27694 | 96 |
| `DOMAIN:Fibronectin-type-III-102:27697-27793` | Fibronectin type-III 102 | DOMAIN | 27697-27793 | 97 |
| `DOMAIN:Ig-like-130:27797-27888` | Ig-like 130 | DOMAIN | 27797-27888 | 92 |
| `DOMAIN:Fibronectin-type-III-103:27895-27989` | Fibronectin type-III 103 | DOMAIN | 27895-27989 | 95 |
| `DOMAIN:Fibronectin-type-III-104:27995-28090` | Fibronectin type-III 104 | DOMAIN | 27995-28090 | 96 |
| `DOMAIN:Fibronectin-type-III-105:28096-28192` | Fibronectin type-III 105 | DOMAIN | 28096-28192 | 97 |
| `DOMAIN:Ig-like-131:28196-28286` | Ig-like 131 | DOMAIN | 28196-28286 | 91 |
| `DOMAIN:Fibronectin-type-III-106:28295-28389` | Fibronectin type-III 106 | DOMAIN | 28295-28389 | 95 |
| `DOMAIN:Fibronectin-type-III-107:28392-28484` | Fibronectin type-III 107 | DOMAIN | 28392-28484 | 93 |
| `DOMAIN:Ig-like-132:28488-28577` | Ig-like 132 | DOMAIN | 28488-28577 | 90 |
| `DOMAIN:Fibronectin-type-III-108:28583-28680` | Fibronectin type-III 108 | DOMAIN | 28583-28680 | 98 |
| `DOMAIN:Fibronectin-type-III-109:28686-28781` | Fibronectin type-III 109 | DOMAIN | 28686-28781 | 96 |
| `DOMAIN:Fibronectin-type-III-110:28784-28879` | Fibronectin type-III 110 | DOMAIN | 28784-28879 | 96 |
| `DOMAIN:Ig-like-133:28882-28974` | Ig-like 133 | DOMAIN | 28882-28974 | 93 |
| `DOMAIN:Fibronectin-type-III-111:28979-29071` | Fibronectin type-III 111 | DOMAIN | 28979-29071 | 93 |
| `DOMAIN:Fibronectin-type-III-112:29081-29177` | Fibronectin type-III 112 | DOMAIN | 29081-29177 | 97 |
| `DOMAIN:Fibronectin-type-III-113:29180-29278` | Fibronectin type-III 113 | DOMAIN | 29180-29278 | 99 |
| `DOMAIN:Ig-like-134:29282-29367` | Ig-like 134 | DOMAIN | 29282-29367 | 86 |
| `DOMAIN:Fibronectin-type-III-114:29378-29473` | Fibronectin type-III 114 | DOMAIN | 29378-29473 | 96 |
| `DOMAIN:Fibronectin-type-III-115:29475-29568` | Fibronectin type-III 115 | DOMAIN | 29475-29568 | 94 |
| `DOMAIN:Ig-like-135:29568-29663` | Ig-like 135 | DOMAIN | 29568-29663 | 96 |
| `DOMAIN:Fibronectin-type-III-116:29670-29764` | Fibronectin type-III 116 | DOMAIN | 29670-29764 | 95 |
| `DOMAIN:Fibronectin-type-III-117:29770-29865` | Fibronectin type-III 117 | DOMAIN | 29770-29865 | 96 |
| `DOMAIN:Fibronectin-type-III-118:29868-29967` | Fibronectin type-III 118 | DOMAIN | 29868-29967 | 100 |
| `DOMAIN:Ig-like-136:29971-30059` | Ig-like 136 | DOMAIN | 29971-30059 | 89 |
| `DOMAIN:Fibronectin-type-III-119:30070-30163` | Fibronectin type-III 119 | DOMAIN | 30070-30163 | 94 |
| `DOMAIN:Fibronectin-type-III-120:30169-30265` | Fibronectin type-III 120 | DOMAIN | 30169-30265 | 97 |
| `DOMAIN:Fibronectin-type-III-121:30271-30367` | Fibronectin type-III 121 | DOMAIN | 30271-30367 | 97 |
| `DOMAIN:Ig-like-137:30371-30460` | Ig-like 137 | DOMAIN | 30371-30460 | 90 |
| `DOMAIN:Fibronectin-type-III-122:30467-30561` | Fibronectin type-III 122 | DOMAIN | 30467-30561 | 95 |
| `DOMAIN:Fibronectin-type-III-123:30564-30658` | Fibronectin type-III 123 | DOMAIN | 30564-30658 | 95 |
| `DOMAIN:Ig-like-138:30663-30754` | Ig-like 138 | DOMAIN | 30663-30754 | 92 |
| `DOMAIN:Fibronectin-type-III-124:30761-30855` | Fibronectin type-III 124 | DOMAIN | 30761-30855 | 95 |
| `DOMAIN:Fibronectin-type-III-125:30861-30956` | Fibronectin type-III 125 | DOMAIN | 30861-30956 | 96 |
| `DOMAIN:Fibronectin-type-III-126:30962-31058` | Fibronectin type-III 126 | DOMAIN | 30962-31058 | 97 |
| `DOMAIN:Ig-like-139:31061-31150` | Ig-like 139 | DOMAIN | 31061-31150 | 90 |
| `DOMAIN:Fibronectin-type-III-127:31158-31254` | Fibronectin type-III 127 | DOMAIN | 31158-31254 | 97 |
| `DOMAIN:Fibronectin-type-III-128:31258-31354` | Fibronectin type-III 128 | DOMAIN | 31258-31354 | 97 |
| `DOMAIN:Fibronectin-type-III-129:31360-31455` | Fibronectin type-III 129 | DOMAIN | 31360-31455 | 96 |
| `DOMAIN:Ig-like-140:31460-31548` | Ig-like 140 | DOMAIN | 31460-31548 | 89 |
| `DOMAIN:Fibronectin-type-III-130:31653-31748` | Fibronectin type-III 130 | DOMAIN | 31653-31748 | 96 |
| `DOMAIN:Fibronectin-type-III-131:31754-31849` | Fibronectin type-III 131 | DOMAIN | 31754-31849 | 96 |
| `DOMAIN:Ig-like-141:31855-31945` | Ig-like 141 | DOMAIN | 31855-31945 | 91 |
| `DOMAIN:Ig-like-142:31955-32046` | Ig-like 142 | DOMAIN | 31955-32046 | 92 |
| `DOMAIN:Fibronectin-type-III-132:32051-32144` | Fibronectin type-III 132 | DOMAIN | 32051-32144 | 94 |

### Titin kinase domain (`kinase`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Protein-kinase:32178-32432` | Protein kinase | DOMAIN | 32178-32432 | 255 |

### M-line Ig region (M1-M10) (`Mline`)

| Feature ID | Label | Type | Inclusive residues | Length (aa) |
|---|---|---|---:|---:|
| `DOMAIN:Ig-like-143:32496-32584` | Ig-like 143 | DOMAIN | 32496-32584 | 89 |
| `DOMAIN:Ig-like-144:32617-32710` | Ig-like 144 | DOMAIN | 32617-32710 | 94 |
| `DOMAIN:Ig-like-145:32722-32811` | Ig-like 145 | DOMAIN | 32722-32811 | 90 |
| `DOMAIN:Ig-like-146:33301-33391` | Ig-like 146 | DOMAIN | 33301-33391 | 91 |
| `DOMAIN:Ig-like-147:33488-33576` | Ig-like 147 | DOMAIN | 33488-33576 | 89 |
| `DOMAIN:Ig-like-148:33645-33732` | Ig-like 148 | DOMAIN | 33645-33732 | 88 |
| `DOMAIN:Ig-like-149:33779-33867` | Ig-like 149 | DOMAIN | 33779-33867 | 89 |
| `DOMAIN:Ig-like-150:33963-34052` | Ig-like 150 | DOMAIN | 33963-34052 | 90 |
| `DOMAIN:Ig-like-151:34061-34149` | Ig-like 151 | DOMAIN | 34061-34149 | 89 |
| `DOMAIN:Ig-like-152:34256-34344` | Ig-like 152 | DOMAIN | 34256-34344 | 89 |

Human execution, finding disposition, and sign-off remain SC-27 gates.
