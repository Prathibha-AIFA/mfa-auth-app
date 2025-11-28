// src/types/config.ts

export interface AuthConfig {
  email: string;
  readableKey: string; // 16-digit key
  createdAt: string;
}

export const STORAGE_KEY = "mfa_authenticator_config";
