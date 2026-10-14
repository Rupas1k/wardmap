import type { Ward } from "../types";

export const automaticIndividualThreshold = 2;
export const automaticMaximumDiameter = 256;
export const automaticMaximumElevationDifference = 64;

export function automaticMergeDistance(): number {
  return 128;
}

export function automaticMinClusterSize(wardCount: number): number {
  return Math.max(2, Math.min(12, Math.round(Math.log2(Math.max(1, wardCount))) - 5));
}

export function automaticMinSamples(wardCount: number): number {
  return Math.max(2, Math.ceil(automaticMinClusterSize(wardCount) / 2));
}

export function shouldClusterAutomatically(wardCount: number): boolean {
  return wardCount >= automaticIndividualThreshold;
}

type Placement = Pick<Ward, "id" | "x_pos" | "y_pos" | "z_pos">;

export function automaticRepresentative(wards: readonly Placement[]): Placement | null {
  if (wards.length === 0) {
    return null;
  }

  const x = wards.reduce((sum, ward) => sum + ward.x_pos, 0) / wards.length;
  const y = wards.reduce((sum, ward) => sum + ward.y_pos, 0) / wards.length;
  let representative = wards[0]!;
  let nearestDistance = Infinity;

  for (const ward of wards) {
    const distance = (ward.x_pos - x) ** 2 + (ward.y_pos - y) ** 2;

    if (
      distance < nearestDistance ||
      (distance === nearestDistance && ward.id < representative.id)
    ) {
      representative = ward;
      nearestDistance = distance;
    }
  }

  return representative;
}

export function constrainAutomaticMemberships(
  wards: readonly Placement[],
  memberships: ReadonlyMap<number, number[]>,
): Map<number, number[]> {
  return constrainMemberships(wards, memberships, {
    maximumSpan: automaticMaximumDiameter,
    minimumGroupSize: automaticMinClusterSize(wards.length),
    maximumElevationDifference: automaticMaximumElevationDifference,
  });
}

export function constrainMemberships(
  wards: readonly Placement[],
  memberships: ReadonlyMap<number, number[]>,
  {
    maximumSpan,
    minimumGroupSize,
    maximumElevationDifference = Infinity,
  }: {
    maximumSpan: number;
    minimumGroupSize: number;
    maximumElevationDifference?: number;
  },
): Map<number, number[]> {
  const wardsById = new Map(wards.map((ward) => [ward.id, ward]));
  const result = new Map<number, number[]>();
  const individualIds: number[] = [];
  const maximumDistanceSquared = maximumSpan ** 2;

  for (const [label, ids] of memberships) {
    if (label < 0) {
      individualIds.push(...ids);

      continue;
    }

    const members = ids
      .flatMap((id) => {
        const ward = wardsById.get(id);

        return ward ? [ward] : [];
      })
      .sort(
        (left, right) => left.x_pos - right.x_pos || left.y_pos - right.y_pos || left.id - right.id,
      );
    const groups: Placement[][] = [];

    for (const ward of members) {
      let nearestGroup: Placement[] | null = null;
      let nearestMaximumDistance = Infinity;

      for (const group of groups) {
        let maximumDistance = 0;

        for (const member of group) {
          const distanceSquared =
            (ward.x_pos - member.x_pos) ** 2 + (ward.y_pos - member.y_pos) ** 2;

          if (
            distanceSquared > maximumDistanceSquared ||
            Math.abs(ward.z_pos - member.z_pos) > maximumElevationDifference
          ) {
            maximumDistance = Infinity;

            break;
          }

          maximumDistance = Math.max(maximumDistance, distanceSquared);
        }

        if (maximumDistance < nearestMaximumDistance) {
          nearestGroup = group;
          nearestMaximumDistance = maximumDistance;
        }
      }

      if (nearestGroup) {
        nearestGroup.push(ward);
      } else {
        groups.push([ward]);
      }
    }

    for (const group of groups) {
      if (group.length < minimumGroupSize) {
        individualIds.push(...group.map((ward) => ward.id));
      } else {
        result.set(
          result.size,
          group.map((ward) => ward.id),
        );
      }
    }
  }

  if (individualIds.length > 0) {
    result.set(-1, individualIds);
  }

  return result;
}
