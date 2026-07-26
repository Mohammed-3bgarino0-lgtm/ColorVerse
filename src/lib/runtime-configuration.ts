export type ColorVerseRuntimeMode = 'trial' | 'production';

const PLACEHOLDER_PATTERNS = [
  /^change[_ -]?after[_ -]?trial$/i,
  /^change[_ -]?me$/i,
  /^replace[_ -]?me$/i,
  /^your[_ -]/i,
  /^your-/i,
  /^placeholder$/i,
  /^example$/i,
  /^test[_ -]?credential/i,
  /^<.*>$/,
];

export function normalizedEnvironmentValue(value: unknown): string {
  return String(value ?? '').trim();
}

export function isConfiguredEnvironmentValue(value: unknown): boolean {
  const normalized = normalizedEnvironmentValue(value);
  if (!normalized) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function environmentFlag(name: string, fallback = false): boolean {
  const value = normalizedEnvironmentValue(process.env[name]).toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value);
}

export function colorVerseRuntimeMode(): ColorVerseRuntimeMode {
  return normalizedEnvironmentValue(process.env.COLORVERSE_RUNTIME_MODE).toLowerCase() === 'production'
    ? 'production'
    : 'trial';
}

export function liveAiEnabled(): boolean {
  return environmentFlag('COLORVERSE_ENABLE_LIVE_AI', false)
    && isConfiguredEnvironmentValue(process.env.GEMINI_API_KEY);
}

export function driveWritesEnabled(): boolean {
  return environmentFlag('COLORVERSE_ENABLE_DRIVE_WRITES', false)
    && isConfiguredEnvironmentValue(process.env.GOOGLE_DRIVE_CLIENT_EMAIL)
    && isConfiguredEnvironmentValue(process.env.GOOGLE_DRIVE_PRIVATE_KEY);
}

export function runtimeConfigurationSummary() {
  return {
    mode: colorVerseRuntimeMode(),
    liveAiEnabled: liveAiEnabled(),
    driveWritesEnabled: driveWritesEnabled(),
    geminiConfigured: isConfiguredEnvironmentValue(process.env.GEMINI_API_KEY),
    driveCredentialsConfigured:
      isConfiguredEnvironmentValue(process.env.GOOGLE_DRIVE_CLIENT_EMAIL)
      && isConfiguredEnvironmentValue(process.env.GOOGLE_DRIVE_PRIVATE_KEY),
  };
}
