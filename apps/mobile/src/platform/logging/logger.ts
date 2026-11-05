type LogContext = Record<string, unknown>;

export function logError(scope: string, error: unknown, context?: LogContext): void {
  if (!__DEV__) {
    return;
  }

  console.error(`[${scope}]`, error, context ?? {});
}
