/**
 * SC-3 Z-disc detail descriptors.
 *
 * This module consumes the reviewed showcase claims and geometry-source records;
 * it owns no biological constant. The output is deliberately local and
 * schematic: the fast-psoas source supports antiparallel actin topology and
 * irregular alpha-actinin doublets, while the isolated Z1Z2/telethonin structure
 * supports a 2:1 antiparallel binding topology. Neither resolves the complete
 * lateral route of human Q8WZ42 through an in-situ Z-disc.
 */

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`ZDiscDetail: ${label} must be finite.`);
  return number;
};

const claim = (spec, id) => {
  const record = spec.showcaseClaims?.objects?.find((object) => object.id === id);
  if (!record) throw new Error(`ZDiscDetail: reviewed claim '${id}' is missing.`);
  return record;
};

const sourceIds = (record) => record.sources.map((source) => source.id);

export function validateZDiscDetail(detail) {
  if (!detail || detail.target !== 'zdisc') {
    throw new Error("validateZDiscDetail: expected target 'zdisc'.");
  }
  if (detail.universal_lattice_rendered !== false) {
    throw new Error('validateZDiscDetail: a universal Z-disc lattice is forbidden.');
  }
  const topology = detail.telethonin_complex?.stoichiometry;
  if (topology?.titin_z1z2 !== 2 || topology?.telethonin !== 1) {
    throw new Error('validateZDiscDetail: telethonin requires two titin Z1Z2 chains and one telethonin.');
  }
  const directions = detail.telethonin_complex?.titin_chains?.map((chain) => chain.direction);
  if (directions?.length !== 2 || !directions.includes(1) || !directions.includes(-1)) {
    throw new Error('validateZDiscDetail: the two Z1Z2 chains must be antiparallel.');
  }
  if (detail.telethonin_complex.titin_chains.filter((chain) => chain.uses_existing_titin).length !== 1) {
    throw new Error('validateZDiscDetail: exactly one Z1Z2 chain must reuse the canonical titin path.');
  }
  const complexChains = detail.telethonin_complex.titin_chains;
  const complexIntervals = complexChains.map((chain) => {
    if (!Array.isArray(chain.complex_points_nm) || chain.complex_points_nm.length < 2) {
      throw new Error('validateZDiscDetail: each Z1Z2 chain needs a finite sandwich proxy.');
    }
    if (!chain.complex_points_nm.every((point) => (
      [point.x, point.y, point.z].every(Number.isFinite)
    ))) {
      throw new Error('validateZDiscDetail: sandwich proxy coordinates must be finite.');
    }
    const xs = chain.complex_points_nm.map((point) => point.x);
    return [Math.min(...xs), Math.max(...xs)];
  });
  const overlapStart = Math.max(...complexIntervals.map(([start]) => start));
  const overlapEnd = Math.min(...complexIntervals.map(([, end]) => end));
  if (!(overlapEnd > overlapStart)) {
    throw new Error('validateZDiscDetail: antiparallel Z1Z2 proxies need a finite shared overlap.');
  }
  const telethonin = detail.telethonin_complex.telethonin_proxy;
  if (![telethonin?.start_nm?.x, telethonin?.start_nm?.y, telethonin?.start_nm?.z,
    telethonin?.end_nm?.x, telethonin?.end_nm?.y, telethonin?.end_nm?.z]
    .every(Number.isFinite)
      || Math.min(telethonin.start_nm.x, telethonin.end_nm.x) < overlapStart - 1e-9
      || Math.max(telethonin.start_nm.x, telethonin.end_nm.x) > overlapEnd + 1e-9
      || Math.abs(telethonin.end_nm.x - telethonin.start_nm.x) < 1e-9) {
    throw new Error('validateZDiscDetail: telethonin must span a finite part of the Z1Z2 overlap.');
  }
  const teleStart = Math.min(telethonin.start_nm.x, telethonin.end_nm.x);
  const teleEnd = Math.max(telethonin.start_nm.x, telethonin.end_nm.x);
  const transverseCentres = complexChains.map((chain) => {
    const contactPoints = chain.complex_points_nm
      .filter((point) => point.x >= teleStart - 1e-9 && point.x <= teleEnd + 1e-9);
    if (!contactPoints.length) {
      throw new Error('validateZDiscDetail: telethonin has no finite contact interval with a Z1Z2 proxy.');
    }
    return {
      y: contactPoints.reduce((sum, point) => sum + point.y, 0) / contactPoints.length,
      z: contactPoints.reduce((sum, point) => sum + point.z, 0) / contactPoints.length,
    };
  });
  const teleCentre = {
    y: (telethonin.start_nm.y + telethonin.end_nm.y) / 2,
    z: (telethonin.start_nm.z + telethonin.end_nm.z) / 2,
  };
  const dy = transverseCentres[1].y - transverseCentres[0].y;
  const dz = transverseCentres[1].z - transverseCentres[0].z;
  const separationSquared = dy * dy + dz * dz;
  const ty = teleCentre.y - transverseCentres[0].y;
  const tz = teleCentre.z - transverseCentres[0].z;
  const between = separationSquared > 1e-12
    ? (ty * dy + tz * dz) / separationSquared
    : Number.NaN;
  const perpendicular = separationSquared > 1e-12
    ? Math.abs(ty * dz - tz * dy) / Math.sqrt(separationSquared)
    : Number.POSITIVE_INFINITY;
  if (!(between >= -1e-9 && between <= 1 + 1e-9 && perpendicular <= 1e-9)) {
    throw new Error('validateZDiscDetail: telethonin must lie between both Z1Z2 sandwich proxies.');
  }

  const general = detail.alpha_actinin?.general_context;
  if (!general?.connectors?.length || general.connectors.length !== general.crosslink_sets?.length
      || general.crosslink_sets.some((set) => set.kind !== 'single')) {
    throw new Error('validateZDiscDetail: general alpha-actinin context requires single schematic links.');
  }
  const connectorsMatchSets = (sets, connectors) => sets.every((set) => {
    const members = connectors.filter((connector) => (
      connector.kind === set.kind && connector.pair_index === set.pair_index
    ));
    const expected = [...set.x_nm].sort((a, b) => a - b);
    const actual = members.map((connector) => {
      if (!Number.isFinite(connector.start_nm?.x) || !Number.isFinite(connector.end_nm?.x)
          || Math.abs(connector.start_nm.x - connector.end_nm.x) > 1e-9) return Number.NaN;
      return connector.start_nm.x;
    }).sort((a, b) => a - b);
    return actual.length === expected.length && actual.every((x, index) => (
      Number.isFinite(x) && Math.abs(x - expected[index]) <= 1e-9
    ));
  });
  if (!connectorsMatchSets(general.crosslink_sets, general.connectors)) {
    throw new Error('validateZDiscDetail: general alpha-actinin connectors drifted from their sets.');
  }
  const exact = detail.alpha_actinin?.doublet_detail;
  const spacing = exact?.spacing_nm;
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new Error('validateZDiscDetail: alpha-actinin doublet spacing must be positive.');
  }
  if (!Array.isArray(exact.audience) || exact.audience.length !== 1
      || exact.audience[0] !== 'EVIDENCE') {
    throw new Error('validateZDiscDetail: exact alpha-actinin doublets must remain Evidence-only.');
  }
  if (!Array.isArray(exact.crosslink_sets) || !Array.isArray(exact.connectors)) {
    throw new Error('validateZDiscDetail: exact alpha-actinin doublet geometry is incomplete.');
  }
  const doublets = exact.crosslink_sets.filter((set) => set.kind === 'doublet');
  if (!doublets.length || doublets.some((set) => (
    set.x_nm.length !== 2 || Math.abs((set.x_nm[1] - set.x_nm[0]) - spacing) > 1e-9
  ))) {
    throw new Error('validateZDiscDetail: every admitted doublet must reproduce its sourced spacing.');
  }
  if (!connectorsMatchSets(doublets, exact.connectors)) {
    throw new Error('validateZDiscDetail: exact alpha-actinin connectors drifted from sourced spacing.');
  }
  const doubletPairs = new Set(doublets.map((set) => set.pair_index));
  if (general.crosslink_sets.every((set) => doubletPairs.has(set.pair_index))) {
    throw new Error('validateZDiscDetail: a non-doublet local crosslink is required.');
  }
  const guidedResolution = detail.resolvability?.guided;
  const evidenceResolution = detail.resolvability?.evidence;
  if (![guidedResolution?.feature_nm, evidenceResolution?.feature_nm]
    .every((value) => Number.isFinite(value) && value > 0)
      || evidenceResolution.feature_nm !== spacing
      || /doublet/i.test(guidedResolution.feature)) {
    throw new Error('validateZDiscDetail: Guided and Evidence resolvability must remain audience-scoped.');
  }
  return detail;
}

export class ZDiscDetail {
  constructor(spec, engine) {
    this.spec = spec;
    this.engine = engine;
    this.networkClaim = claim(spec, 'zdisc_local_network');
    this.doubletClaim = claim(spec, 'zdisc_alpha_actinin_doublets');
    this.telethoninClaim = claim(spec, 'zdisc_telethonin_sandwich');
    this.omissionClaim = claim(spec, 'universal_zdisc_lattice_icon');

    for (const record of [this.networkClaim, this.doubletClaim, this.telethoninClaim]) {
      if (!['ADMIT', 'ADMIT_SCHEMATIC'].includes(record.decision)
          || record.render_evidence_class !== 'SCHEMATIC') {
        throw new Error(`ZDiscDetail: claim '${record.id}' is not admitted as SCHEMATIC.`);
      }
    }
    if (this.omissionClaim.decision !== 'OMIT') {
      throw new Error('ZDiscDetail: the universal Z-disc lattice omission was weakened.');
    }

    const spacing = spec.geometrySources?.parameters?.find((parameter) => (
      parameter.component === 'Z-disc'
      && parameter.parameter === 'α-actinin/actin doublet spacing'
    ));
    if (!spacing || spacing.unit !== 'nm' || spacing.primary_source !== '10.1016/j.cell.2021.02.047') {
      throw new Error('ZDiscDetail: sourced alpha-actinin doublet-spacing record is missing.');
    }
    this.doubletSpacingNm = finite(spacing.value, 'doublet spacing');
    const thin = spec.sarcomere.components.find((component) => component.id === 'thin_filament');
    this.generalCrosslinkDiameterNm = finite(
      thin?.dimensions_nm?.diameter, 'thin-filament diameter',
    ) / 3;
  }

  detailAt(sl, thinSites) {
    const geometry = this.engine.geometryAt(sl);
    const zHalf = finite(geometry.zdisc.width, 'Z-disc width') / 2;
    // The detail is intentionally LOCAL even when the caller asks the surrounding
    // scene for a multi-ring Evidence patch. Choose the six nearest sites first;
    // only then order them azimuthally for deterministic pairing. Sorting the full
    // patch by angle before truncating selected outer-ring filaments and made the
    // crosslinks jump discontinuously as the lattice ring control changed.
    const transverseRadius = (site) => Math.hypot(site.y, site.z);
    const azimuth = (site) => Math.atan2(site.z, site.y);
    const sites = [...(thinSites || [])]
      .sort((a, b) => transverseRadius(a) - transverseRadius(b) || azimuth(a) - azimuth(b))
      .slice(0, 6)
      .sort((a, b) => azimuth(a) - azimuth(b));
    if (sites.length !== 6) {
      throw new Error(`ZDiscDetail: six local thin-filament sites are required; received ${sites.length}.`);
    }

    const pairs = [[sites[0], sites[1]], [sites[2], sites[3]], [sites[4], sites[5]]];
    const segment = (id, site, direction) => ({
      id,
      direction,
      start_nm: {
        x: direction > 0 ? -0.35 * zHalf : -1.7 * zHalf,
        y: site.y,
        z: site.z,
      },
      end_nm: {
        x: direction > 0 ? 1.7 * zHalf : 0.35 * zHalf,
        y: site.y,
        z: site.z,
      },
    });
    const actinSegments = pairs.flatMap(([current, adjacent], index) => [
      segment(`current_${index}`, current, 1),
      segment(`adjacent_${index}`, adjacent, -1),
    ]);

    const connector = (set, x, memberIndex) => ({
      id: `${set.kind}_${set.pair_index}_${memberIndex}`,
      kind: set.kind,
      pair_index: set.pair_index,
      start_nm: { x, y: pairs[set.pair_index][0].y, z: pairs[set.pair_index][0].z },
      end_nm: { x, y: pairs[set.pair_index][1].y, z: pairs[set.pair_index][1].z },
    });
    // Guided mode gets one heterogeneous, topology-only alpha-actinin link per
    // local pair. Evidence mode replaces two of those singles with the sourced
    // ~6 nm doublets; the exact spacing never has to leak into the Guided object.
    const generalCrosslinkSets = [
      { kind: 'single', pair_index: 0, x_nm: [0] },
      { kind: 'single', pair_index: 1, x_nm: [0.4 * zHalf] },
      { kind: 'single', pair_index: 2, x_nm: [-0.45 * zHalf] },
    ];
    const generalConnectors = generalCrosslinkSets.flatMap((set) => (
      set.x_nm.map((x, memberIndex) => connector(set, x, memberIndex))
    ));
    const halfSpacing = this.doubletSpacingNm / 2;
    const doubletSets = [
      { kind: 'doublet', pair_index: 0, x_nm: [-halfSpacing, halfSpacing] },
      {
        kind: 'doublet', pair_index: 1,
        x_nm: [0.4 * zHalf - halfSpacing, 0.4 * zHalf + halfSpacing],
      },
    ];
    const doubletConnectors = doubletSets.flatMap((set) => (
      set.x_nm.map((x, memberIndex) => connector(set, x, memberIndex))
    ));

    const proxyOffset = zHalf / 5;
    const overlapHalf = 0.42 * zHalf;
    const join = 0.78 * zHalf;
    const sandwichSeparation = 0.28 * proxyOffset;
    // Both Z1Z2 proxies occupy a finite shared interval around telethonin before
    // diverging toward their opposing half-sarcomeres. This is a topology glyph,
    // not an atomic fit or a claim about the unresolved full in-situ lateral route.
    const currentComplexPoints = [
      { x: -overlapHalf, y: sandwichSeparation, z: 0 },
      { x: 0, y: sandwichSeparation, z: 0 },
      { x: overlapHalf, y: sandwichSeparation, z: 0 },
      { x: join, y: 0, z: 0 },
    ];
    const opposingPoints = [
      { x: overlapHalf, y: -sandwichSeparation, z: 0 },
      { x: 0, y: -sandwichSeparation, z: 0 },
      { x: -overlapHalf, y: -sandwichSeparation, z: 0 },
      { x: -join, y: -proxyOffset, z: 0 },
    ];
    const detail = {
      schema: 'titin-anchor-detail/1',
      target: 'zdisc',
      landmark_nm: { x: geometry.zdisc.X, width: geometry.zdisc.width },
      evidence_class: 'SCHEMATIC',
      resolvability: {
        guided: {
          feature_nm: this.generalCrosslinkDiameterNm,
          feature: 'schematic alpha-actinin crosslink diameter',
          render_only: true,
        },
        evidence: {
          feature_nm: this.doubletSpacingNm,
          feature: 'alpha-actinin doublet separation',
        },
      },
      actin_network: {
        segments: actinSegments,
        topology: 'three local current/adjacent antiparallel pairs',
        evidence_class: this.networkClaim.render_evidence_class,
        source_ids: sourceIds(this.networkClaim),
        not_claimed: this.networkClaim.not_claimed,
        render_only: 'axial proxy lengths and selected local pair routing',
      },
      alpha_actinin: {
        general_context: {
          crosslink_sets: generalCrosslinkSets,
          connectors: generalConnectors,
          evidence_class: this.networkClaim.render_evidence_class,
          source_ids: sourceIds(this.networkClaim),
          not_claimed: this.networkClaim.not_claimed,
          render_only: 'which three local pairs carry one representative crosslink',
        },
        doublet_detail: {
          spacing_nm: this.doubletSpacingNm,
          crosslink_sets: doubletSets,
          connectors: doubletConnectors,
          audience: this.doubletClaim.audience,
          evidence_class: this.doubletClaim.render_evidence_class,
          source_ids: sourceIds(this.doubletClaim),
          not_claimed: this.doubletClaim.not_claimed,
          render_only: 'which two local pairs carry the Evidence-only doublet overlay',
        },
      },
      telethonin_complex: {
        stoichiometry: { titin_z1z2: 2, telethonin: 1 },
        titin_chains: [
          {
            id: 'canonical_current_half', direction: 1, uses_existing_titin: true,
            anchor_nm: { x: 0, y: 0, z: 0 },
            complex_points_nm: currentComplexPoints,
          },
          {
            id: 'adjacent_half_proxy', direction: -1, uses_existing_titin: false,
            complex_points_nm: opposingPoints,
          },
        ],
        telethonin_proxy: {
          start_nm: { x: -0.82 * overlapHalf, y: 0, z: 0 },
          end_nm: { x: 0.82 * overlapHalf, y: 0, z: 0 },
        },
        direction_markers: [
          { id: 'current', direction: 1, at_nm: { x: 0.7 * zHalf, y: 0, z: 0 } },
          {
            id: 'adjacent', direction: -1,
            at_nm: { x: -0.7 * zHalf, y: -proxyOffset, z: 0 },
          },
        ],
        evidence_class: this.telethoninClaim.render_evidence_class,
        source_ids: sourceIds(this.telethoninClaim),
        not_claimed: this.telethoninClaim.not_claimed,
        render_only: 'finite sandwich glyph, in-situ lateral placement, and proxy shapes',
      },
      universal_lattice_rendered: false,
      omission: {
        claim_id: this.omissionClaim.id,
        source_ids: sourceIds(this.omissionClaim),
        not_claimed: this.omissionClaim.not_claimed,
      },
    };
    return validateZDiscDetail(detail);
  }
}
