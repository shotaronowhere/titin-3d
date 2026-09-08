# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mvp-preview.spec.js >> MVP 390: final evidence action selects titin and exposes the exact source route
- Location: test/browser/mvp-preview.spec.js:97:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: keyboard.press: Protocol error (Input.dispatchKeyEvent): Page closed
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]: Titin. One titin polypeptide runs continuously through a half-sarcomere from its Z-disc N terminus to its M-band C terminus. Claim STRONGLY INFERRED · render SCHEMATIC. Review Selected structure in the Research Evidence tab for the full claim and exact sources.
  - 'complementary "Research: visualization controls and scientific readouts" [ref=e4]':
    - generic [ref=e6]:
      - generic [ref=e7]:
        - heading "Research" [level=1] [ref=e8]
        - generic [ref=e9]: "Current target: Titin"
      - generic [ref=e10]:
        - button "Large type" [ref=e11] [cursor=pointer]
        - button "Close" [ref=e12] [cursor=pointer]
    - tablist "Research sections" [ref=e13]:
      - tab "Inspect" [ref=e14] [cursor=pointer]
      - tab "Measure" [ref=e15] [cursor=pointer]
      - tab "Evidence" [selected] [ref=e16] [cursor=pointer]
      - tab "Sources & build" [ref=e17] [cursor=pointer]
    - tabpanel "Evidence" [ref=e18]:
      - heading "Selected structure" [level=2] [ref=e19]
      - button "Sources for this object" [ref=e20] [cursor=pointer]
      - generic [ref=e21]:
        - generic "Converging evidence; not directly measured here." [ref=e22]: "Inferred · scientific class: strongly inferred"
        - article [ref=e23]:
          - heading "Titin" [level=3] [ref=e24]
          - paragraph [ref=e25]: One titin polypeptide runs continuously through a half-sarcomere from its Z-disc N terminus to its M-band C terminus.
          - group [ref=e26]:
            - generic "For specialists" [ref=e27] [cursor=pointer]
          - generic [ref=e28]:
            - term [ref=e29]:
              - text: Scientific claim
              - generic [ref=e30]: STRONGLY INFERRED
            - definition [ref=e31]: One titin polypeptide runs continuously through a half-sarcomere from its Z-disc N terminus to its M-band C terminus.
            - term [ref=e32]:
              - text: Rendered depiction
              - generic [ref=e33]: SCHEMATIC
            - definition [ref=e34]: The picture is classified separately from the scientific statement.
          - generic [ref=e35]:
            - heading "Limitations" [level=4] [ref=e36]
            - list [ref=e37]:
              - listitem [ref=e38]: The study constrains longitudinal topology, not a resolved atom-by-atom path.
              - listitem [ref=e39]: Sequence order does not resolve transverse placement.
          - generic [ref=e40]:
            - heading "Not claimed" [level=4] [ref=e41]
            - list [ref=e42]:
              - listitem [ref=e43]: a resolved smooth molecular trajectory
              - listitem [ref=e44]: known transverse azimuth along the entire chain
              - listitem [ref=e45]: uniform spring behavior along the chain
              - listitem [ref=e46]: an atom-resolved continuous path
              - listitem [ref=e47]: a known universal transverse azimuth
              - listitem [ref=e48]: uniform elasticity along the molecule
              - listitem [ref=e49]: a measured conformation for the disordered segments
          - generic [ref=e50]:
            - heading "Sources" [level=4] [ref=e51]
            - generic [ref=e52]:
              - 'link "The organization of titin filaments in the half-sarcomere revealed by monoclonal antibodies in immunoelectron microscopy: a map of ten nonrepetitive epitopes starting at the Z line extends close to the M line — Fürst, Osborn, Nave, and Weber (1988) · Journal of Cell Biology" [ref=e53]':
                - /url: https://doi.org/10.1083/jcb.106.5.1563
              - text: "[10.1083/jcb.106.5.1563]"
            - generic [ref=e54]:
              - link "Titin Q8WZ42 (human) sequence and domain architecture — UniProt Consortium (2024) · UniProtKB" [ref=e55]:
                - /url: https://www.uniprot.org/uniprotkb/Q8WZ42/entry
              - text: "[UniProt:Q8WZ42]"
      - heading "Scientific decisions" [level=2] [ref=e56]
      - generic [ref=e57]: SD-01 approved · SD-02 deferred · SD-03 approved · SD-04 approved · SD-05 approved · citation-backed AI adjudication authorized by the project owner · independent human review not performed
      - heading "Current Tour claim" [level=2] [ref=e58]
      - article [ref=e60]:
        - heading "What do we know?" [level=3] [ref=e61]
        - paragraph [ref=e62]: The application is generated from cited scientific records, measured or modeled data, explicit evidence classes, procedural geometry, and executable validation rather than from an unaudited AI illustration.
        - group [ref=e63]:
          - generic "For specialists" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - term [ref=e66]:
            - text: Ai provenance pipeline
            - generic [ref=e67]: MEASURED
          - definition [ref=e68]: The application is generated from cited scientific records, measured or modeled data, explicit evidence classes, procedural geometry, and executable validation rather than from an unaudited AI illustration.
          - term [ref=e69]:
            - text: Titin continuity trace
            - generic [ref=e70]: STRONGLY INFERRED
          - definition [ref=e71]: One titin polypeptide runs continuously through a half-sarcomere from its Z-disc N terminus to its M-band C terminus.
          - term [ref=e72]:
            - text: Titin region architecture
            - generic [ref=e73]: MEASURED
          - definition [ref=e74]: "Titin is regionally heterogeneous: elastic I-band segments lie in series with an A-band segment integrated with the thick filament and a terminal M-region."
          - term [ref=e75]:
            - text: Regional extension story
            - generic [ref=e76]: MODELED
          - definition [ref=e77]: Across the modeled range, tandem-Ig chains primarily straighten while disordered spring regions extend; ordinary length change does not require widespread folded-domain unfolding.
          - term [ref=e78]:
            - text: N2a interaction hub card
            - generic [ref=e79]: MEASURED
          - definition [ref=e80]: The N2A element contains a structured UN2A core with flexible flanks and experimentally characterized CARP binding; it can be discussed as an interaction hub without adding partner coordinates.
          - term [ref=e81]:
            - text: Titin kinase card
            - generic [ref=e82]: MEASURED
          - definition [ref=e83]: Titin contains a kinase domain near the A/M junction; its structural presence is established, while a single mechanical activation and signaling mechanism is not treated as settled.
          - term [ref=e84]:
            - text: Rendered depiction
            - generic [ref=e85]: SCHEMATIC
          - definition [ref=e86]: The picture is classified separately from the scientific statement.
        - generic [ref=e87]:
          - heading "Limitations" [level=4] [ref=e88]
          - list [ref=e89]:
            - listitem [ref=e90]: The diagram summarizes the real pipeline and must link to inspectable records.
            - listitem [ref=e91]: Automated tests do not replace external scientific review.
            - listitem [ref=e92]: The study constrains longitudinal topology, not a resolved atom-by-atom path.
            - listitem [ref=e93]: Sequence order does not resolve transverse placement.
            - listitem [ref=e94]: Sequence annotations do not determine every 3D conformation.
            - listitem [ref=e95]: Supports axial organization, not a universal exact azimuth.
            - listitem [ref=e96]: Supports the qualitative physiological mechanism, not this model's exact per-region nanometer partition.
            - listitem [ref=e97]: Computed model output is not a measured molecular trajectory.
            - listitem [ref=e98]: Does not establish a complete in-sarcomere signalosome geometry.
            - listitem [ref=e99]: Single-molecule behavior is not an in-situ partner trajectory.
            - listitem [ref=e100]: Sequence location does not establish activation mechanism.
            - listitem [ref=e101]: The isolated structures do not establish in-situ orientation or a signaling trajectory.
        - generic [ref=e102]:
          - heading "Not claimed" [level=4] [ref=e103]
          - list [ref=e104]:
            - listitem [ref=e105]: that AI is a scientific authority
            - listitem [ref=e106]: that passing tests proves every biological interpretation
            - listitem [ref=e107]: that procedural geometry is experimental density
            - listitem [ref=e108]: a resolved smooth molecular trajectory
            - listitem [ref=e109]: known transverse azimuth along the entire chain
            - listitem [ref=e110]: uniform spring behavior along the chain
            - listitem [ref=e111]: atom-level region surfaces
            - listitem [ref=e112]: a single elastic constant for all regions
            - listitem [ref=e113]: exact unresolved linker conformations
            - listitem [ref=e114]: normalization of AFM-scale Ig unfolding
            - listitem [ref=e115]: a measured time trajectory
            - listitem [ref=e116]: activation-dependent titin stiffening
            - listitem [ref=e117]: complete N2A signalosome composition
            - listitem [ref=e118]: resolved partner coordinates
            - listitem [ref=e119]: one universal downstream pathway
            - listitem [ref=e120]: a settled mechanosensor mechanism
            - listitem [ref=e121]: in-situ kinase orientation
            - listitem [ref=e122]: causal downstream signaling animation
            - listitem [ref=e123]: a settled causal signaling mechanism
        - generic [ref=e124]:
          - heading "Sources" [level=4] [ref=e125]
          - generic [ref=e126]: data/geometry_strategy.json — Local record · data/geometry_strategy.json [data/geometry_strategy.json]
          - generic [ref=e127]: scripts/validate_geometry.py — Local record · scripts/validate_geometry.py [scripts/validate_geometry.py]
          - generic [ref=e128]:
            - 'link "The organization of titin filaments in the half-sarcomere revealed by monoclonal antibodies in immunoelectron microscopy: a map of ten nonrepetitive epitopes starting at the Z line extends close to the M line — Fürst, Osborn, Nave, and Weber (1988) · Journal of Cell Biology" [ref=e129]':
              - /url: https://doi.org/10.1083/jcb.106.5.1563
            - text: "[10.1083/jcb.106.5.1563]"
          - generic [ref=e130]:
            - link "Titin Q8WZ42 (human) sequence and domain architecture — UniProt Consortium (2024) · UniProtKB" [ref=e131]:
              - /url: https://www.uniprot.org/uniprotkb/Q8WZ42/entry
            - text: "[UniProt:Q8WZ42]"
          - generic [ref=e132]:
            - link "The Axial Alignment of Titin on the Muscle Thick Filament Supports Its Role as a Molecular Ruler — Bennett et al. (2020) · J Mol Biol" [ref=e133]:
              - /url: https://doi.org/10.1016/j.jmb.2020.06.025
            - text: "[10.1016/j.jmb.2020.06.025]"
          - generic [ref=e134]:
            - 'link "Titin extensibility in situ: entropic elasticity of permanently folded and permanently unfolded molecular segments — Trombitás et al. (1998) · Journal of Cell Biology" [ref=e135]':
              - /url: https://doi.org/10.1083/jcb.140.4.853
            - text: "[10.1083/jcb.140.4.853]"
          - generic [ref=e136]: data/mechanical_model.json — Local record · data/mechanical_model.json [data/mechanical_model.json]
          - generic [ref=e137]:
            - link "Molecular Characterisation of Titin N2A and Its Binding of CARP Reveals a Titin/Actin Cross-linking Mechanism — Zhou et al. (2021) · J Mol Biol" [ref=e138]:
              - /url: https://doi.org/10.1016/j.jmb.2021.166901
            - text: "[10.1016/j.jmb.2021.166901]"
          - generic [ref=e139]:
            - 'link "Single-Molecule Force Spectroscopy on the N2A Element of Titin: Effects of Phosphorylation and CARP — Lanzicher et al. (2020) · Front Physiol" [ref=e140]':
              - /url: https://doi.org/10.3389/fphys.2020.00173
            - text: "[10.3389/fphys.2020.00173]"
          - generic [ref=e141]:
            - link "Geometry of titin kinase domains measured from deposited coordinates (PDB 1TKI, PDB 4JNW); scripts/measure_structures.py — This project (Phase 6 pipeline) (2026) · Derived measurement" [ref=e142]:
              - /url: https://www.rcsb.org/structure/1TKI
            - text: "[PDB:1TKI+4JNW (Phase 6 measurement, kinase)]"
      - heading "Expert cards" [level=2] [ref=e143]
      - generic [ref=e144]: Scope and omission notes for the optional context layers. These are available only in Research.
      - generic [ref=e145]:
        - article [ref=e146]:
          - 'heading "Spring and scaffold: what the A-band super-repeat does and does not settle" [level=3] [ref=e147]'
          - paragraph [ref=e148]: "Titin is regionally heterogeneous: elastic I-band segments lie in series with an A-band segment integrated with the thick filament and a terminal M-region."
          - group [ref=e149]:
            - generic "For specialists" [ref=e150] [cursor=pointer]
          - generic [ref=e151]:
            - term [ref=e152]:
              - text: Finding 1
              - generic [ref=e153]: ESTABLISHED
            - definition [ref=e154]: The C-zone contains an eleven-domain sequence pattern; this display uses a labelled 43.78 nm interval derived from one source-context mean spacing, not an exact molecular repeat length.
            - term [ref=e155]:
              - text: Finding 2
              - generic [ref=e156]: ESTABLISHED
            - definition [ref=e157]: In this model the bound segment's end-to-end span stays constant while sarcomere length changes.
            - term [ref=e158]:
              - text: Finding 3
              - generic [ref=e159]: PROPOSED
            - definition [ref=e160]: That titin acts as a molecular ruler setting thick-filament length.
            - term [ref=e161]:
              - text: Finding 4
              - generic [ref=e162]: PROPOSED
            - definition [ref=e163]: That titin participates causally in myosin regulation.
            - term [ref=e164]:
              - text: Scientific claim
              - generic [ref=e165]: MEASURED
            - definition [ref=e166]: "Titin is regionally heterogeneous: elastic I-band segments lie in series with an A-band segment integrated with the thick filament and a terminal M-region."
            - term [ref=e167]:
              - text: Rendered depiction
              - generic [ref=e168]: SCHEMATIC
            - definition [ref=e169]: The picture is classified separately from the scientific statement.
          - generic [ref=e170]:
            - heading "Limitations" [level=4] [ref=e171]
            - list [ref=e172]:
              - listitem [ref=e173]: Sequence annotations do not determine every 3D conformation.
              - listitem [ref=e174]: Supports axial organization, not a universal exact azimuth.
          - generic [ref=e175]:
            - heading "Not claimed" [level=4] [ref=e176]
            - list [ref=e177]:
              - listitem [ref=e178]: atom-level region surfaces
              - listitem [ref=e179]: a single elastic constant for all regions
              - listitem [ref=e180]: exact unresolved linker conformations
              - listitem [ref=e181]: a settled ruler mechanism for thick-filament length
              - listitem [ref=e182]: a settled regulatory pathway from titin to myosin
              - listitem [ref=e183]: identity or exact register among the derived 43.78 nm display interval, H periodicity, and L periodicity
              - listitem [ref=e184]: an exact universal A-band azimuth for the bound segment
          - generic [ref=e185]:
            - heading "Sources" [level=4] [ref=e186]
            - generic [ref=e187]:
              - link "Titin Q8WZ42 (human) sequence and domain architecture — UniProt Consortium (2024) · UniProtKB" [ref=e188]:
                - /url: https://www.uniprot.org/uniprotkb/Q8WZ42/entry
              - text: "[UniProt:Q8WZ42]"
            - generic [ref=e189]:
              - link "The Axial Alignment of Titin on the Muscle Thick Filament Supports Its Role as a Molecular Ruler — Bennett et al. (2020) · J Mol Biol" [ref=e190]:
                - /url: https://doi.org/10.1016/j.jmb.2020.06.025
              - text: "[10.1016/j.jmb.2020.06.025]"
            - generic [ref=e191]:
              - link "Dependence of thick filament structure in relaxed mammalian skeletal muscle on temperature and interfilament spacing — Caremani et al. (2021) · J Gen Physiol" [ref=e192]:
                - /url: https://doi.org/10.1085/jgp.202012713
              - text: "[10.1085/jgp.202012713]"
            - generic [ref=e193]:
              - 'link "Fine mapping titin''s C-zone: Matching cardiac myosin-binding protein C stripes with titin''s super-repeats — Tonino et al. (2019) · Journal of Molecular and Cellular Cardiology" [ref=e194]':
                - /url: https://doi.org/10.1016/j.yjmcc.2019.05.026
              - text: "[10.1016/j.yjmcc.2019.05.026]"
        - article [ref=e195]:
          - heading "Optional MyBP-C context, and why cardiac coordinates were not imported" [level=3] [ref=e196]
          - paragraph [ref=e197]: Skeletal MyBP-C is an accessory C-zone protein associated with the thick filament in an approximately 43 nm periodic context and can influence lattice and myosin-head regulation.
          - group [ref=e198]:
            - generic "For specialists" [ref=e199] [cursor=pointer]
          - generic [ref=e200]:
            - term [ref=e201]:
              - text: Finding 1
              - generic [ref=e202]: ESTABLISHED
            - definition [ref=e203]: Fast skeletal MyBP-C occupies the C-zone at the approximately 43 nm thick-filament repeat, at roughly three molecules per repeat.
            - term [ref=e204]:
              - text: Finding 2
              - generic [ref=e205]: OPEN
            - definition [ref=e206]: The stripe register, azimuth, outward reach, and binding pose for this reference-sequence render are unresolved, so the drawn path stays schematic.
            - term [ref=e207]:
              - text: Finding 3
              - generic [ref=e208]: OPEN
            - definition [ref=e209]: Whether a direct titin–MyBP-C contact exists in this scope; none is depicted.
            - term [ref=e210]:
              - text: Scientific claim
              - generic [ref=e211]: MEASURED
            - definition [ref=e212]: Skeletal MyBP-C is an accessory C-zone protein associated with the thick filament in an approximately 43 nm periodic context and can influence lattice and myosin-head regulation.
            - term [ref=e213]:
              - text: Rendered depiction
              - generic [ref=e214]: SCHEMATIC
            - definition [ref=e215]: The picture is classified separately from the scientific statement.
          - generic [ref=e216]:
            - heading "Limitations" [level=4] [ref=e217]
            - list [ref=e218]:
              - listitem [ref=e219]: Supports optional skeletal context, not exact human coordinates, domain path, stripe register, reach, or binding pose.
          - generic [ref=e220]:
            - heading "Not claimed" [level=4] [ref=e221]
            - list [ref=e222]:
              - listitem [ref=e223]: cardiac cMyBP-C coordinates
              - listitem [ref=e224]: a universal rigid thick-to-thin bridge
              - listitem [ref=e225]: a direct titin–MyBP-C contact
              - listitem [ref=e226]: three exact molecules at every human titin superrepeat
              - listitem [ref=e227]: cardiac cMyBP-C coordinates transferred into the reference-sequence model
              - listitem [ref=e228]: three exact molecules at every human titin super-repeat
              - listitem [ref=e229]: a resolved stripe register, azimuth, reach, or binding pose
          - generic [ref=e230]:
            - heading "Sources" [level=4] [ref=e231]
            - generic [ref=e232]:
              - link "Myosin-binding protein C regulates the sarcomere lattice and stabilizes the OFF states of myosin heads — Hessel et al. (2024) · Nature Communications" [ref=e233]:
                - /url: https://doi.org/10.1038/s41467-024-46957-7
              - text: "[10.1038/s41467-024-46957-7]"
        - article [ref=e234]:
          - heading "N2A as a mechanical and interaction hub" [level=3] [ref=e235]
          - paragraph [ref=e236]: The N2A element contains a structured UN2A core with flexible flanks and experimentally characterized CARP binding; it can be discussed as an interaction hub without adding partner coordinates.
          - group [ref=e237]:
            - generic "For specialists" [ref=e238] [cursor=pointer]
          - generic [ref=e239]:
            - term [ref=e240]:
              - text: Finding 1
              - generic [ref=e241]: ESTABLISHED
            - definition [ref=e242]: N2A contains a structured UN2A core with flexible flanking sequence.
            - term [ref=e243]:
              - text: Finding 2
              - generic [ref=e244]: ESTABLISHED
            - definition [ref=e245]: CARP binding to N2A is experimentally characterised.
            - term [ref=e246]:
              - text: Finding 3
              - generic [ref=e247]: PROPOSED
            - definition [ref=e248]: That N2A acts as an in-situ signalling hub coupling strain to downstream pathways.
            - term [ref=e249]:
              - text: Finding 4
              - generic [ref=e250]: OPEN
            - definition [ref=e251]: The complete composition and geometry of any N2A signalosome in an intact sarcomere.
            - term [ref=e252]:
              - text: Scientific claim
              - generic [ref=e253]: MEASURED
            - definition [ref=e254]: The N2A element contains a structured UN2A core with flexible flanks and experimentally characterized CARP binding; it can be discussed as an interaction hub without adding partner coordinates.
            - term [ref=e255]:
              - text: Rendered depiction
              - generic [ref=e256]: SCHEMATIC
            - definition [ref=e257]: The picture is classified separately from the scientific statement.
          - generic [ref=e258]:
            - heading "Limitations" [level=4] [ref=e259]
            - list [ref=e260]:
              - listitem [ref=e261]: Does not establish a complete in-sarcomere signalosome geometry.
              - listitem [ref=e262]: Single-molecule behavior is not an in-situ partner trajectory.
          - generic [ref=e263]:
            - heading "Not claimed" [level=4] [ref=e264]
            - list [ref=e265]:
              - listitem [ref=e266]: complete N2A signalosome composition
              - listitem [ref=e267]: resolved partner coordinates
              - listitem [ref=e268]: one universal downstream pathway
              - listitem [ref=e269]: an added partner molecule in the 3-D scene
          - generic [ref=e270]:
            - heading "Sources" [level=4] [ref=e271]
            - generic [ref=e272]:
              - link "Molecular Characterisation of Titin N2A and Its Binding of CARP Reveals a Titin/Actin Cross-linking Mechanism — Zhou et al. (2021) · J Mol Biol" [ref=e273]:
                - /url: https://doi.org/10.1016/j.jmb.2021.166901
              - text: "[10.1016/j.jmb.2021.166901]"
            - generic [ref=e274]:
              - 'link "Single-Molecule Force Spectroscopy on the N2A Element of Titin: Effects of Phosphorylation and CARP — Lanzicher et al. (2020) · Front Physiol" [ref=e275]':
                - /url: https://doi.org/10.3389/fphys.2020.00173
              - text: "[10.3389/fphys.2020.00173]"
        - article [ref=e276]:
          - 'heading "Titin kinase: an established domain, an unsettled mechanism" [level=3] [ref=e277]'
          - paragraph [ref=e278]: Titin contains a kinase domain near the A/M junction; its structural presence is established, while a single mechanical activation and signaling mechanism is not treated as settled.
          - group [ref=e279]:
            - generic "For specialists" [ref=e280] [cursor=pointer]
          - generic [ref=e281]:
            - term [ref=e282]:
              - text: Finding 1
              - generic [ref=e283]: ESTABLISHED
            - definition [ref=e284]: A kinase domain sits near the A-band/M-band junction of titin.
            - term [ref=e285]:
              - text: Finding 2
              - generic [ref=e286]: ESTABLISHED
            - definition [ref=e287]: Isolated kinase-domain structures give the measured proxy dimensions drawn here.
            - term [ref=e288]:
              - text: Finding 3
              - generic [ref=e289]: PROPOSED
            - definition [ref=e290]: That mechanical strain opens the domain and triggers a specific signalling cascade.
            - term [ref=e291]:
              - text: Finding 4
              - generic [ref=e292]: OPEN
            - definition [ref=e293]: The domain's orientation and conformation inside an intact sarcomere.
            - term [ref=e294]:
              - text: Scientific claim
              - generic [ref=e295]: MEASURED
            - definition [ref=e296]: Titin contains a kinase domain near the A/M junction; its structural presence is established, while a single mechanical activation and signaling mechanism is not treated as settled.
            - term [ref=e297]:
              - text: Rendered depiction
              - generic [ref=e298]: SCHEMATIC
            - definition [ref=e299]: The picture is classified separately from the scientific statement.
          - generic [ref=e300]:
            - heading "Limitations" [level=4] [ref=e301]
            - list [ref=e302]:
              - listitem [ref=e303]: Sequence location does not establish activation mechanism.
              - listitem [ref=e304]: The isolated structures do not establish in-situ orientation or a signaling trajectory.
          - generic [ref=e305]:
            - heading "Not claimed" [level=4] [ref=e306]
            - list [ref=e307]:
              - listitem [ref=e308]: a settled mechanosensor mechanism
              - listitem [ref=e309]: in-situ kinase orientation
              - listitem [ref=e310]: causal downstream signaling animation
          - generic [ref=e311]:
            - heading "Sources" [level=4] [ref=e312]
            - generic [ref=e313]:
              - link "Titin Q8WZ42 (human) sequence and domain architecture — UniProt Consortium (2024) · UniProtKB" [ref=e314]:
                - /url: https://www.uniprot.org/uniprotkb/Q8WZ42/entry
              - text: "[UniProt:Q8WZ42]"
            - generic [ref=e315]:
              - link "Geometry of titin kinase domains measured from deposited coordinates (PDB 1TKI, PDB 4JNW); scripts/measure_structures.py — This project (Phase 6 pipeline) (2026) · Derived measurement" [ref=e316]:
                - /url: https://www.rcsb.org/structure/1TKI
              - text: "[PDB:1TKI+4JNW (Phase 6 measurement, kinase)]"
        - article [ref=e317]:
          - 'heading "Length-dependent activation: a proposal, not a simulation" [level=3] [ref=e318]'
          - paragraph [ref=e319]: Passive titin tension and MyBP-C are among proposed contributors to length-dependent thick-filament regulation, but the current visualization does not simulate that mechanism.
          - group [ref=e320]:
            - generic "For specialists" [ref=e321] [cursor=pointer]
          - generic [ref=e322]:
            - term [ref=e323]:
              - text: Finding 1
              - generic [ref=e324]: ESTABLISHED
            - definition [ref=e325]: Force at a given calcium level depends on sarcomere length.
            - term [ref=e326]:
              - text: Finding 2
              - generic [ref=e327]: PROPOSED
            - definition [ref=e328]: That passive titin tension contributes causally to that length dependence.
            - term [ref=e329]:
              - text: Finding 3
              - generic [ref=e330]: PROPOSED
            - definition [ref=e331]: That MyBP-C mediates part of the same thick-filament regulation.
            - term [ref=e332]:
              - text: Finding 4
              - generic [ref=e333]: OPEN
            - definition [ref=e334]: Whether this model could distinguish those proposals; it contains no activation solver.
            - term [ref=e335]:
              - text: Scientific claim
              - generic [ref=e336]: INFERRED
            - definition [ref=e337]: Passive titin tension and MyBP-C are among proposed contributors to length-dependent thick-filament regulation, but the current visualization does not simulate that mechanism.
            - term [ref=e338]:
              - text: Rendered depiction
              - generic [ref=e339]: SCHEMATIC
            - definition [ref=e340]: The picture is classified separately from the scientific statement.
          - generic [ref=e341]:
            - heading "Limitations" [level=4] [ref=e342]
            - list [ref=e343]:
              - listitem [ref=e344]: Supports a proposed regulatory context, not a complete causal solver or exact human geometry.
          - generic [ref=e345]:
            - heading "Not claimed" [level=4] [ref=e346]
            - list [ref=e347]:
              - listitem [ref=e348]: settled causality
              - listitem [ref=e349]: that titin is the actomyosin motor
              - listitem [ref=e350]: automatic coupling between sarcomere length and activation
          - generic [ref=e351]:
            - heading "Sources" [level=4] [ref=e352]
            - generic [ref=e353]:
              - link "Myosin-binding protein C regulates the sarcomere lattice and stabilizes the OFF states of myosin heads — Hessel et al. (2024) · Nature Communications" [ref=e354]:
                - /url: https://doi.org/10.1038/s41467-024-46957-7
              - text: "[10.1038/s41467-024-46957-7]"
        - article [ref=e355]:
          - heading "One gene, many titins — and one of them is modelled here" [level=3] [ref=e356]
          - paragraph [ref=e357]: The active visualization uses the citation-reviewed human TTN reference sequence Q8WZ42-1 at the explicitly named structural state without assigning a tissue-specific construct.
          - group [ref=e358]:
            - generic "For specialists" [ref=e359] [cursor=pointer]
          - generic [ref=e360]:
            - term [ref=e361]:
              - text: Finding 1
              - generic [ref=e362]: ESTABLISHED
            - definition [ref=e363]: Alternative splicing of one TTN gene yields tissue- and muscle-specific titin isoforms.
            - term [ref=e364]:
              - text: Finding 2
              - generic [ref=e365]: ESTABLISHED
            - definition [ref=e366]: The model identity is the reference sequence supplied by the scientific-scope ledger.
            - term [ref=e367]:
              - text: Finding 3
              - generic [ref=e368]: OPEN
            - definition [ref=e369]: How the geometry shown here would differ for another isoform; no second isoform is modelled.
            - term [ref=e370]:
              - text: Scientific claim
              - generic [ref=e371]: MEASURED
            - definition [ref=e372]: The active visualization uses the citation-reviewed human TTN reference sequence Q8WZ42-1 at the explicitly named structural state without assigning a tissue-specific construct.
            - term [ref=e373]:
              - text: Rendered depiction
              - generic [ref=e374]: SCHEMATIC
            - definition [ref=e375]: The picture is classified separately from the scientific statement.
          - generic [ref=e376]:
            - heading "Limitations" [level=4] [ref=e377]
            - list [ref=e378]:
              - listitem [ref=e379]: None beyond the explicit reference label.
              - listitem [ref=e380]: The badge reports the model state; it does not convert a modeled state into an observation.
          - generic [ref=e381]:
            - heading "Not claimed" [level=4] [ref=e382]
            - list [ref=e383]:
              - listitem [ref=e384]: an isoform-neutral titin molecule
              - listitem [ref=e385]: a cardiac titin model
              - listitem [ref=e386]: a universal physiological resting length
              - listitem [ref=e387]: a per-isoform comparison of passive stiffness
          - generic [ref=e388]:
            - heading "Sources" [level=4] [ref=e389]
            - generic [ref=e390]:
              - link "Titin Q8WZ42 (human) sequence and domain architecture — UniProt Consortium (2024) · UniProtKB" [ref=e391]:
                - /url: https://www.uniprot.org/uniprotkb/Q8WZ42/entry
              - text: "[UniProt:Q8WZ42]"
            - generic [ref=e392]: data/structural_states.json — Local record · data/structural_states.json [data/structural_states.json]
        - article [ref=e393]:
          - heading "What this model still cannot tell you" [level=3] [ref=e394]
          - paragraph [ref=e395]: The application is generated from cited scientific records, measured or modeled data, explicit evidence classes, procedural geometry, and executable validation rather than from an unaudited AI illustration.
          - group [ref=e396]:
            - generic "For specialists" [ref=e397] [cursor=pointer]
          - generic [ref=e398]:
            - term [ref=e399]:
              - text: Finding 1
              - generic [ref=e400]: OPEN
            - definition [ref=e401]: The azimuthal placement of titin strands on a skeletal thick filament; the cardiac arrangement is measured but out of scope.
            - term [ref=e402]:
              - text: Finding 2
              - generic [ref=e403]: OPEN
            - definition [ref=e404]: The molecular organization of the M-band; no M1 density is inferred from the retained averaged maps.
            - term [ref=e405]:
              - text: Finding 3
              - generic [ref=e406]: OPEN
            - definition [ref=e407]: Time-resolved active mechanics, including the real time-varying Poisson ratio of the lattice.
            - term [ref=e408]:
              - text: Scientific claim
              - generic [ref=e409]: MEASURED
            - definition [ref=e410]: The application is generated from cited scientific records, measured or modeled data, explicit evidence classes, procedural geometry, and executable validation rather than from an unaudited AI illustration.
            - term [ref=e411]:
              - text: Rendered depiction
              - generic [ref=e412]: SCHEMATIC
            - definition [ref=e413]: The picture is classified separately from the scientific statement.
          - generic [ref=e414]:
            - heading "Limitations" [level=4] [ref=e415]
            - list [ref=e416]:
              - listitem [ref=e417]: The diagram summarizes the real pipeline and must link to inspectable records.
              - listitem [ref=e418]: Automated tests do not replace external scientific review.
          - generic [ref=e419]:
            - heading "Not claimed" [level=4] [ref=e420]
            - list [ref=e421]:
              - listitem [ref=e422]: that AI is a scientific authority
              - listitem [ref=e423]: that passing tests proves every biological interpretation
              - listitem [ref=e424]: that procedural geometry is experimental density
              - listitem [ref=e425]: a resolved skeletal titin azimuth
              - listitem [ref=e426]: a complete M-band molecular structure
              - listitem [ref=e427]: time-resolved active contraction
              - listitem [ref=e428]: that these gaps are the only ones
          - generic [ref=e429]:
            - heading "Sources" [level=4] [ref=e430]
            - generic [ref=e431]: data/geometry_strategy.json — Local record · data/geometry_strategy.json [data/geometry_strategy.json]
            - generic [ref=e432]: scripts/validate_geometry.py — Local record · scripts/validate_geometry.py [scripts/validate_geometry.py]
            - generic [ref=e433]:
              - link "Human cardiac myosin filament C-zone (atomic model) — Dutta et al. (2023) · Protein Data Bank" [ref=e434]:
                - /url: https://www.rcsb.org/structure/8G4L
              - text: "[PDB:8G4L]"
            - generic [ref=e435]:
              - link "Structure of the native myosin filament in the relaxed cardiac sarcomere — Tamborrini et al. (2023) · Nature" [ref=e436]:
                - /url: https://doi.org/10.1038/s41586-023-06690-5
              - text: "[10.1038/s41586-023-06690-5]"
            - generic [ref=e437]:
              - 'link "A mechanism for sarcomere breathing: volume change and advective flow within the myofilament lattice — Cass, Williams, Irving, Lauga, Malingen et al. (2021) · Biophysical Journal" [ref=e438]':
                - /url: https://doi.org/10.1016/j.bpj.2021.08.006
              - text: "[10.1016/j.bpj.2021.08.006]"
      - heading "Atomic claim evidence" [level=2] [ref=e439]
      - generic [ref=e440]: Scientific status is grouped independently from depiction status. Labels and patterns repeat the visual coding.
      - generic [ref=e441]:
        - group [ref=e442]:
          - generic "Measured · 13" [ref=e443] [cursor=pointer]
        - group [ref=e445]:
          - generic "Strongly inferred · 6" [ref=e446] [cursor=pointer]
        - group [ref=e448]:
          - generic "Modeled · 3" [ref=e449] [cursor=pointer]
        - group [ref=e451]:
          - generic "Inferred · 1" [ref=e452] [cursor=pointer]
        - group [ref=e454]:
          - generic "Schematic · 1" [ref=e455] [cursor=pointer]
        - group [ref=e457]:
          - generic "Not known · 3" [ref=e458] [cursor=pointer]
      - heading "Rendered scene evidence" [level=2] [ref=e460]
      - generic [ref=e461]: Transparency encodes confidence; colour encodes identity; the inventory below names each class in text.
      - button "confidence display" [pressed] [ref=e462] [cursor=pointer]
      - generic [ref=e463]:
        - generic [ref=e464]:
          - generic [ref=e465]: MEASURED
          - generic [ref=e466]: "15"
        - generic [ref=e467]: zdisc.axial width, thin filament.length, thin filament.diameter, thick filament.length, thick filament.diameter, Z1Z2.domain count, prox Ig.domain count, N2A.domain count, N2A.UN2A structured core, dist Ig.domain count, Aband super.domain count, Mline.domain count, d10 length and preparation response, thin at trigonal points, titin copy number
        - generic [ref=e468]:
          - generic [ref=e469]: STRONGLY INFERRED
          - generic [ref=e470]: "6"
        - generic [ref=e471]: thick filament.bare zone, mline.axial position, mline.crosslink relationships, Z1Z2.axial span, hexagonal symmetry, d10 scaling law
        - generic [ref=e472]:
          - generic [ref=e473]: MODELED
          - generic [ref=e474]: "6"
        - generic [ref=e475]: prox Ig.axial span, N2A.axial span, post N2A unknown.axial span, PEVK.axial span, dist Ig.axial span, d10 absolute
        - generic [ref=e476]:
          - generic [ref=e477]: SCHEMATIC
          - generic [ref=e478]: "24"
        - generic [ref=e479]: zdisc.primitive choice, zdisc.lateral extent, thin filament.primitive choice, thick filament.primitive choice, mline.primitive choice, Z1Z2.backbone path, Z1Z2.primitive choice, prox Ig.backbone path, prox Ig.primitive choice, N2A.primitive choice, post N2A unknown.primitive choice, PEVK.primitive choice, dist Ig.backbone path, dist Ig.primitive choice, Aband super.axial span, Aband super.backbone path, Aband super.primitive choice, kinase.axial span, kinase.backbone path, kinase.primitive choice, Mline.axial span, Mline.backbone path, Mline.primitive choice, titin azimuthal arrangement
        - generic [ref=e480]:
          - generic [ref=e481]: UNKNOWN
          - generic [ref=e482]: "5"
        - generic [ref=e483]: mline.axial extent, N2A.backbone path, N2A.UN2A flanks and in situ pose, post N2A unknown.backbone path, PEVK.backbone path
      - heading "Not claimed by this render" [level=2] [ref=e484]
      - list [ref=e485]:
        - listitem [ref=e486]: titin azimuthal phase around the thick filament
        - listitem [ref=e487]: lattice disorder, defects, or domain boundaries
        - listitem [ref=e488]: time-varying Poisson ratio during active contraction
        - listitem [ref=e489]: titin tube radius (render width, not a molecular diameter)
        - listitem [ref=e490]: Z-disc transverse extent (drawn to span the immediate filament neighbourhood)
        - listitem [ref=e491]: M-band midpoint ring size (coordinate marker, not M1 density or M-band width)
        - listitem [ref=e492]: radial titin path through the I-band (no thick filament to follow there)
        - listitem [ref=e493]: smooth CatmullRom interpolation between domain positions
        - listitem [ref=e494]: SC-2 continuity trace (exact Level-0 axial endpoints; representative schematic transverse display offset)
        - listitem [ref=e495]: reduced N2A/PEVK tube radius (visual distinction, not molecular diameter)
        - listitem [ref=e496]: SC-10 continuity-trace ribbon width (screen-space width in CSS pixels, held constant at every camera distance; a reading width, not a molecular dimension)
        - listitem [ref=e497]: SC-10 titin emphasis halo (additive reading aid around the titin path; not a molecular envelope, and it moves no opacity that encodes confidence)
        - listitem [ref=e498]: atom-level region surfaces
        - listitem [ref=e499]: a single elastic constant for all regions
        - listitem [ref=e500]: exact unresolved linker conformations
        - listitem [ref=e501]: that the derived 11-domain display interval equals the H or L periodicity
        - listitem [ref=e502]: an exact register between titin sequence repeats and myosin periodicities
        - listitem [ref=e503]: a settled causal mechanism by which titin sets thick-filament length or regulates myosin
      - generic [ref=e504]:
        - generic [ref=e505]: "Local filament context built: 1 thick filament(s), 6 thin filament(s) per half-sarcomere; these display counts do not represent whole-muscle stoichiometry."
        - generic [ref=e506]: The stored 4.03e6 nm3 cell-volume parameter reproduces the referenced calculator and is MODELED, not an absolute value adopted from Irving 2000. Irving independently measures the direction and preparation dependence of d10(SL). The constant-volume law is a labelled quasi-static idealization; do NOT present it as exact instantaneous contraction behavior (Cass 2021).
        - generic [ref=e507]: 1 representative titin path(s) built per half-sarcomere; biological copy number is not depicted. Component controls may hide built geometry.
```

# Test source

```ts
  13  | test('MVP endpoint replay traverses the working range twice without losing the Spring frame', async ({ page }) => {
  14  |   test.setTimeout(90_000);
  15  |   await boot(page);
  16  |   for (let replay = 0; replay < 2; replay += 1) {
  17  |     await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  18  |     await page.locator('#stagePlay').click();
  19  |     await expect(page.locator('#stagePlay')).toHaveText('Pause');
  20  |     const length = Number(await page.locator('#sl').inputValue());
  21  |     expect(length).toBeGreaterThanOrEqual(2000);
  22  |     expect(length).toBeLessThan(2400);
  23  |     await expect(page.locator('#objectAnnouncement')).toContainText('Replay reset to 2,000 nm');
  24  |     await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
  25  |     await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  26  |     expect(new URL(page.url()).hash).toContain('scene=spring');
  27  |   }
  28  | });
  29  | 
  30  | test('MVP reduced-motion replay resets before showing the endpoint', async ({ page }) => {
  31  |   await setReducedMotion(page);
  32  |   await boot(page, 390, 844);
  33  |   // Observe real slider writes: an endpoint-only assertion would pass the old no-op.
  34  |   await page.evaluate(() => {
  35  |     window.__previewLengths = [];
  36  |     const input = document.querySelector('#sl');
  37  |     const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  38  |     Object.defineProperty(input, 'value', {
  39  |       get() { return descriptor.get.call(this); },
  40  |       set(value) { window.__previewLengths.push(Number(value)); descriptor.set.call(this, value); },
  41  |     });
  42  |   });
  43  |   await page.locator('#stagePlay').click();
  44  |   await expect(page.locator('#sl')).toHaveValue('2400');
  45  |   await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  46  |   expect(await page.evaluate(() => window.__previewLengths)).toEqual([2000, 2400]);
  47  | });
  48  | 
  49  | for (const [width, height] of [[1280, 720], [390, 844]]) {
  50  |   test(`MVP ${width}: modeled force opens above the fold with sensitivity explained`, async ({ page }) => {
  51  |     await boot(page, width, height);
  52  |     await expect(page.locator('#stageForce')).toContainText('modeled passive force per titin');
  53  |     await expect(page.locator('#stageForce')).not.toContainText('±');
  54  |     await page.locator('#stageForce').click();
  55  |     await expect(page.locator('#passiveForceHeading')).toBeFocused();
  56  |     const heading = await page.locator('#passiveForceHeading').boundingBox();
  57  |     const tabs = await page.locator('#drawerTabs').boundingBox();
  58  |     expect(heading.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  59  |     expect(heading.y + heading.height).toBeLessThan(height);
  60  |     await expect(page.locator('.force-readout')).toContainText('literature parameter sensitivity, not a confidence interval');
  61  |     const readout = await page.locator('.force-readout').boundingBox();
  62  |     const chart = await page.locator('#forceCurve .force-chart').boundingBox();
  63  |     expect(readout.y).toBeGreaterThan(heading.y);
  64  |     expect(readout.y + readout.height).toBeLessThan(height);
  65  |     expect(chart.y).toBeLessThan(height);
  66  |     expect(readout.y + readout.height).toBeLessThanOrEqual(chart.y);
  67  |     await page.locator('#closeEvidence').click();
  68  |     await expect(page.locator('#stageForce')).toBeFocused();
  69  |     await expect(page.locator('#sl')).toHaveValue('2400');
  70  |     await page.locator('#chapterNext').click();
  71  |     await expect(page.locator('#guidedLattice')).toBeHidden();
  72  |     await page.locator('#audienceEvidence').click();
  73  |     await page.locator('#tabMeasure').click();
  74  |     await expect(page.locator('#latticeCrossSection')).not.toBeEmpty();
  75  |     await page.locator('#tabEvidence').click();
  76  |     await expect(page.locator('#notes')).toContainText('1 representative titin path(s)');
  77  |     await expect(page.locator('#notes')).not.toContainText('6 of 42');
  78  |   });
  79  | }
  80  | 
  81  | 
  82  | test('MVP Research scope matches the canonical tissue-neutral construct through both entries', async ({ page }) => {
  83  |   const scope = JSON.parse(readFileSync(new URL('../../data/scientific_scope.json', import.meta.url)));
  84  |   await boot(page);
  85  |   await page.locator('#audienceEvidence').click();
  86  |   await page.locator('#tabInspect').click();
  87  |   await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
  88  |   await expect(page.locator('#scopeDetails')).toContainText('does not simulate calcium activation or active contraction');
  89  |   await expect(page.locator('#scopeDetails')).not.toContainText('Human skeletal-muscle reference construct');
  90  |   await page.locator('#closeEvidence').click();
  91  |   await page.locator('#scopeBadge').click();
  92  |   await expect(page.locator('#scopeDetails')).toBeFocused();
  93  |   await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
  94  | });
  95  | 
  96  | for (const [width, height] of [[1280, 720], [390, 844]]) {
  97  |   test(`MVP ${width}: final evidence action selects titin and exposes the exact source route`, async ({ page }) => {
  98  |     await setReducedMotion(page);
  99  |     await boot(page, width, height);
  100 |     await expect(page.locator('#chapterInspectEvidence')).toBeHidden();
  101 |     // Rehearse the complete route: Measure scrolls the shared Research panel
  102 |     // before the finale opens a different section. Its old offset must not leak.
  103 |     await page.locator('#stageForce').click();
  104 |     await expect(page.locator('#passiveForceHeading')).toBeFocused();
  105 |     await page.locator('#closeEvidence').click();
  106 |     await page.locator('#chapterNext').focus();
  107 |     await page.keyboard.press('Enter');
  108 |     await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
  109 |     await page.locator('#chapterNext').click();
  110 |     const button = page.locator('#chapterInspectEvidence');
  111 |     await expect(button).toBeVisible();
  112 |     await button.focus();
> 113 |     await page.keyboard.press('Enter');
      |                         ^ Error: keyboard.press: Protocol error (Input.dispatchKeyEvent): Page closed
  114 |     await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  115 |     await expect(page.locator('#closeEvidence')).toBeFocused();
  116 |     await expect(page.locator('#selectedEvidence')).toContainText('Titin');
  117 |     const sources = page.locator('#selectedEvidenceSourcesLink');
  118 |     const box = await sources.boundingBox();
  119 |     expect(box.y).toBeGreaterThanOrEqual(0);
  120 |     expect(box.y + box.height).toBeLessThan(height);
  121 |     await sources.click();
  122 |     await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  123 |     await page.locator('#bibliography .source-result summary').first().click();
  124 |     await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
  125 |     await page.locator('#closeEvidence').click();
  126 |     await expect(button).toBeFocused();
  127 |     await page.locator('#chapterNext').click();
  128 |     await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  129 |     await expect(button).toBeHidden();
  130 |   });
  131 | }
  132 | 
  133 | 
  134 | test('MVP intermediate force labels retain declared precision and a stable control row', async ({ page }) => {
  135 |   await boot(page);
  136 |   await page.locator('#sl').fill('2200');
  137 |   await expect(page.locator('#stageForce b')).toHaveText('≈0.5 pN');
  138 |   const initial = await page.locator('#guidedCard').boundingBox();
  139 |   for (const length of [2000, 2250, 2267, 2300, 2399, 2400]) {
  140 |     await page.locator('#sl').fill(String(length));
  141 |     await expect.poll(() => new URL(page.url()).hash).toContain(`sl=${length}`);
  142 |     await expect(page.locator('#stageForce b')).toHaveText(/^≈(?:0\.\d{1,2}|1(?:\.\d)?) pN$/);
  143 |     const card = await page.locator('#guidedCard').boundingBox();
  144 |     expect(Math.abs(card.height - initial.height)).toBeLessThan(1);
  145 |   }
  146 | });
  147 | 
```