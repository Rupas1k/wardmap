import type { Ward } from "../types";

export interface ManualLocation {
  id: string;
  name: string | null;
  wardIds: number[];
}

export function isManualLocation(value: unknown): value is ManualLocation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ManualLocation>;

  return Boolean(
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 100 &&
    (candidate.name === null ||
      (typeof candidate.name === "string" &&
        candidate.name.length <= 80 &&
        candidate.name === candidate.name.trim())) &&
    Array.isArray(candidate.wardIds) &&
    candidate.wardIds.length >= 2 &&
    candidate.wardIds.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(candidate.wardIds).size === candidate.wardIds.length &&
    candidate.wardIds.every((id, index, wardIds) => index === 0 || (wardIds[index - 1] ?? id) < id),
  );
}

export function isManualLocations(value: unknown): value is ManualLocation[] {
  if (!Array.isArray(value) || !value.every(isManualLocation)) {
    return false;
  }

  const locationIds = value.map((location) => location.id);
  const wardIds = value.flatMap((location) => location.wardIds);

  return (
    new Set(locationIds).size === locationIds.length && new Set(wardIds).size === wardIds.length
  );
}

export function manualLocationMembershipKey(locations: ManualLocation[]): string {
  return JSON.stringify(locations.map(({ id, wardIds }) => [id, wardIds]));
}

export function compatibleManualLocations(
  locations: ManualLocation[],
  wards: Ward[],
): ManualLocation[] {
  const wardsById = new Map(wards.map((ward) => [ward.id, ward]));

  return locations.filter((location) => {
    const wardTypes = new Set(
      location.wardIds.flatMap((id) => {
        const ward = wardsById.get(id);

        return ward ? [ward.is_obs] : [];
      }),
    );

    return wardTypes.size <= 1;
  });
}

export function validateManualLocations(wards: Ward[], locations: ManualLocation[]): void {
  const wardsById = new Map(wards.map((ward) => [ward.id, ward]));
  const claimedWardIds = new Set<number>();

  for (const location of locations) {
    const members = location.wardIds.flatMap((id) => {
      const ward = wardsById.get(id);

      return ward ? [ward] : [];
    });

    if (members.some((ward) => claimedWardIds.has(ward.id))) {
      throw new Error("A ward belongs to more than one manual location");
    }

    if (new Set(members.map((ward) => ward.is_obs)).size > 1) {
      throw new Error("Observer and sentry wards cannot share a manual location");
    }

    members.forEach((ward) => claimedWardIds.add(ward.id));
  }
}

export function activeManualLocations(
  wards: Ward[],
  locations: ManualLocation[],
): ManualLocation[] {
  const activeWardIds = new Set(wards.map((ward) => ward.id));

  return locations.flatMap((location) => {
    const wardIds = location.wardIds.filter((id) => activeWardIds.has(id));

    return wardIds.length > 0 ? [{ ...location, wardIds }] : [];
  });
}

export function manualLocationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `location-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
