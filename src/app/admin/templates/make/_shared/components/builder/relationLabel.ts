import type { SlugRelationOption } from "../SearchBuilder";

export function formatRelationLabel(r: SlugRelationOption): string {
  return r.description ? `${r.masterSlug} → ${r.slaveSlug} (${r.description})` : `${r.masterSlug} → ${r.slaveSlug}`;
}
