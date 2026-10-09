/** A phase's number: 3 for p03; null for a phase outside the numbering, like the kickoff. */
export function phaseNumber(id: string): number | null {
  const number = /^p(\d+)$/.exec(id);
  return number ? Number(number[1]) : null;
}
