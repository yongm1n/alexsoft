/** Publishing responsibility only; this is not a legal staffing-ratio check. */
export function getUncoveredPostingResidents(residents, staff) {
  return residents.filter(
    (resident) =>
      resident.status === "active" &&
      !staff.some(
        (employee) =>
          employee.status === "active" &&
          employee.permissions.view &&
          employee.permissions.post &&
          employee.residentIds.includes(resident.id),
      ),
  );
}

/** Warn about the impact of a change without blocking immediate revocation. */
export function getNewlyUncoveredPostingResidents(
  residents,
  previousStaff,
  nextStaff,
) {
  const alreadyUncovered = new Set(
    getUncoveredPostingResidents(residents, previousStaff).map(
      (resident) => resident.id,
    ),
  );
  return getUncoveredPostingResidents(residents, nextStaff).filter(
    (resident) => !alreadyUncovered.has(resident.id),
  );
}
