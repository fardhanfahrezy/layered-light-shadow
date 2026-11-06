export class PluginError extends Error {
  constructor(
    public readonly code:
      | "CONFLICT"
      | "UNSUPPORTED"
      | "STORAGE"
      | "INVALID"
      | "FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PluginError";
  }
}
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
