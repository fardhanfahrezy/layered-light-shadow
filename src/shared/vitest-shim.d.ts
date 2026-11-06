// Allows offline typechecks when Vitest has not yet been downloaded.
// When dependencies are installed, the real Vitest runtime handles the imports.
declare module "vitest" {
  export const describe: (name: string, callback: () => void) => void;
  export const it: (name: string, callback: () => void) => void;
  export const expect: (actual: unknown) => {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
    toHaveLength(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
  };
}
