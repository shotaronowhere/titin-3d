/**
 * SC-3 M-band descriptor generator.
 *
 * The exact sarcomere midpoint is kept separate from the thick-filament bare
 * zone. Sparse transverse connectors express only the reviewed relationship
 * that M-band proteins integrate neighboring thick filaments and titin near the
 * center. Their exact register and molecular identity remain unresolved.
 */

const claim = (spec, id) => {
  const record = spec.showcaseClaims?.objects?.find((object) => object.id === id);
  if (!record) throw new Error(`MBandDetail: reviewed claim '${id}' is missing.`);
  return record;
};

const sourceIds = (record) => record.sources.map((source) => source.id);

export function validateMBandDetail(detail) {
  if (!detail || detail.target !== 'mline') {
    throw new Error("validateMBandDetail: expected target 'mline'.");
  }
  if (Object.hasOwn(detail.midpoint, 'width_nm') || detail.midpoint.kind !== 'coordinate_reference') {
    throw new Error('validateMBandDetail: the midpoint cannot carry an M-band width.');
  }
  if (!Number.isFinite(detail.bare_zone?.width_nm)
      || Math.abs((detail.bare_zone.end_nm - detail.bare_zone.start_nm)
        - detail.bare_zone.width_nm) > 1e-9) {
    throw new Error('validateMBandDetail: bare-zone extent is invalid.');
  }
  if (detail.m1_density_rendered !== false) {
    throw new Error('validateMBandDetail: M1 density is omitted in the retained model.');
  }
  if (!detail.crosslinks?.length
      || detail.crosslinks.some((link) => link.evidence_class !== 'SCHEMATIC')) {
    throw new Error('validateMBandDetail: every crosslink must remain SCHEMATIC.');
  }
  if (detail.titin_relationship?.required_visible_halves !== 2) {
    throw new Error('validateMBandDetail: M-band detail requires titin from both half-sarcomeres.');
  }
  return detail;
}

export class MBandDetail {
  constructor(spec, engine) {
    this.spec = spec;
    this.engine = engine;
    this.crosslinkClaim = claim(spec, 'mband_midpoint_and_crosslinks');
    this.bareClaim = claim(spec, 'bare_zone_head_absence');
    this.m1Claim = claim(spec, 'mband_m1_density');
    if (this.crosslinkClaim.decision !== 'REPLACE_CURRENT'
        || this.crosslinkClaim.render_evidence_class !== 'SCHEMATIC') {
      throw new Error('MBandDetail: M-band replacement claim is not admitted as SCHEMATIC.');
    }
    if (this.m1Claim.decision !== 'OMIT') {
      throw new Error('MBandDetail: M1-density omission was weakened.');
    }

    this.thick = spec.sarcomere.components.find((component) => component.id === 'thick_filament');
    this.mline = spec.sarcomere.components.find((component) => component.id === 'mline');
    if (!this.thick || !this.mline) throw new Error('MBandDetail: required components are missing.');
    if (Number.isFinite(this.mline.dimensions_nm?.width_X)) {
      throw new Error('MBandDetail: a numeric M-line width would restore the forbidden bare-zone slab.');
    }
    this.bareZoneNm = Number(this.thick.dimensions_nm?.bare_zone_center);
    this.thickDiameterNm = Number(this.thick.dimensions_nm?.diameter);
    if (![this.bareZoneNm, this.thickDiameterNm].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error('MBandDetail: thick-filament bare-zone width and diameter are required.');
    }
  }

  detailAt(sl, thickSites) {
    const geometry = this.engine.geometryAt(sl);
    const midpoint = geometry.mline.X;
    const sites = [...(thickSites || [])];
    const central = sites.find((site) => Math.hypot(site.y, site.z) < 1e-9);
    const nearest = sites
      .filter((site) => Math.hypot(site.y, site.z) > 1e-9)
      .sort((a, b) => Math.hypot(a.y, a.z) - Math.hypot(b.y, b.z));
    if (!central || nearest.length < 6) {
      throw new Error('MBandDetail: one central and six neighboring thick sites are required.');
    }
    // Three alternating neighbors express sparse integration without inventing a
    // complete regular M-band lattice.
    const selected = [nearest[0], nearest[2], nearest[4]];
    const radius = this.thickDiameterNm / 2;
    const links = selected.map((site, index) => {
      const distance = Math.hypot(site.y, site.z);
      const uy = site.y / distance;
      const uz = site.z / distance;
      return {
        id: `schematic_crosslink_${index}`,
        start_nm: { x: midpoint, y: central.y + uy * radius, z: central.z + uz * radius },
        end_nm: { x: midpoint, y: site.y - uy * radius, z: site.z - uz * radius },
        evidence_class: 'SCHEMATIC',
        identity: 'myomesin-family M-band crosslink context; exact molecule unresolved',
      };
    });
    const detail = {
      schema: 'titin-anchor-detail/1',
      target: 'mline',
      evidence_class: 'SCHEMATIC',
      midpoint: {
        x_nm: midpoint,
        kind: 'coordinate_reference',
        evidence_class: 'STRONGLY INFERRED',
        not_claimed: 'an observed M1 density or a measured M-band width',
      },
      bare_zone: {
        start_nm: midpoint - this.bareZoneNm / 2,
        end_nm: midpoint + this.bareZoneNm / 2,
        width_nm: this.bareZoneNm,
        property_of: 'thick_filament_head_distribution',
        evidence_class: this.bareClaim.render_evidence_class,
        source_ids: sourceIds(this.bareClaim),
        not_claimed: this.bareClaim.not_claimed,
      },
      crosslinks: links,
      context_thick_slices: selected.map((site, index) => ({
        id: `neighbor_${index}`,
        y: site.y,
        z: site.z,
        start_nm: midpoint - this.thickDiameterNm,
        end_nm: midpoint + this.thickDiameterNm,
        diameter_nm: this.thickDiameterNm,
      })),
      crosslink_claim: {
        claim_id: this.crosslinkClaim.id,
        source_ids: sourceIds(this.crosslinkClaim),
        not_claimed: this.crosslinkClaim.not_claimed,
        identity_policy: 'myomesin-family context; no unresolved density assigned to one protein',
        axial_placement_policy: 'grouped at the exact midpoint for presentation; no M-line coordinate adopted',
      },
      titin_relationship: {
        required_visible_halves: 2,
        uses_existing_canonical_paths: true,
        relationship: 'mirrored M-region titins arrive from opposing half-sarcomeres',
      },
      resolvability: {
        feature_nm: this.thickDiameterNm / 5,
        feature: 'schematic crosslink render diameter',
      },
      render_dimensions_nm: {
        crosslink_radius: this.thickDiameterNm / 10,
        neighbor_slice_span: 2 * this.thickDiameterNm,
      },
      m1_density_rendered: false,
      m1_omission: {
        claim_id: this.m1Claim.id,
        source_ids: sourceIds(this.m1Claim),
        not_claimed: this.m1Claim.not_claimed,
      },
    };
    return validateMBandDetail(detail);
  }
}
