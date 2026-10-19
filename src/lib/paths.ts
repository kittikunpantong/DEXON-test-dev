export function linePath(lineNumber: string): string {
  return `/lines/${encodeURIComponent(lineNumber)}`;
}

export function cmlPath(lineNumber: string, cmlNumber: number): string {
  return `${linePath(lineNumber)}/cml/${cmlNumber}`;
}

export function testPointPath(lineNumber: string, cmlNumber: number, tpNumber: number): string {
  return `${cmlPath(lineNumber, cmlNumber)}/tp/${tpNumber}`;
}

export function thicknessPath(lineNumber: string, cmlNumber: number, tpNumber: number, inspectionDate: string): string {
  return `${testPointPath(lineNumber, cmlNumber, tpNumber)}/thickness/${inspectionDate}`;
}
