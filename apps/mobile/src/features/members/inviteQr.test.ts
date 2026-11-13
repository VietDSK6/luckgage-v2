import { parseScannedInviteCode } from './inviteQr';

describe('parseScannedInviteCode', () => {
  it('accepts an invite code from a QR and normalizes case', () => {
    expect(parseScannedInviteCode(' luck-8k4m2p7q ')).toBe('LUCK-8K4M2P7Q');
  });

  it('rejects unrelated QR content and malformed codes', () => {
    expect(parseScannedInviteCode('https://example.com/?code=LUCK-8K4M2P7Q')).toBeNull();
    expect(parseScannedInviteCode('LUCK-8I4M2P7Q')).toBeNull();
    expect(parseScannedInviteCode('LUCK-8K4M2P7')).toBeNull();
  });
});
