const INVITE_CODE = /^LUCK-[2-9A-HJ-NP-Z]{8}$/;

export function parseScannedInviteCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return INVITE_CODE.test(code) ? code : null;
}
