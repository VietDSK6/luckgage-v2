import * as SecureStore from 'expo-secure-store';

export type RefreshCredential = {
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export interface RefreshCredentialStore {
  read(): Promise<RefreshCredential | null>;
  write(credential: RefreshCredential): Promise<void>;
  clear(): Promise<void>;
}

const REFRESH_CREDENTIAL_KEY = 'luckgage.mobile.refresh-session.v1';

export class ExpoSecureRefreshCredentialStore implements RefreshCredentialStore {
  async read(): Promise<RefreshCredential | null> {
    const stored = await SecureStore.getItemAsync(REFRESH_CREDENTIAL_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as Partial<RefreshCredential>;
      if (
        typeof parsed.refreshToken !== 'string' ||
        parsed.refreshToken.length < 32 ||
        typeof parsed.refreshTokenExpiresAt !== 'string' ||
        !Number.isFinite(Date.parse(parsed.refreshTokenExpiresAt))
      ) {
        await this.clear();
        return null;
      }
      if (Date.parse(parsed.refreshTokenExpiresAt) <= Date.now()) {
        await this.clear();
        return null;
      }
      return {
        refreshToken: parsed.refreshToken,
        refreshTokenExpiresAt: parsed.refreshTokenExpiresAt,
      };
    } catch {
      await this.clear();
      return null;
    }
  }

  async write(credential: RefreshCredential): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_CREDENTIAL_KEY, JSON.stringify(credential), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_CREDENTIAL_KEY);
  }
}
