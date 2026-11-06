export type PreviewTimerState = {
  request: number;
  timeout: number | undefined;
};

export function invalidatePendingPreview(
  previewState: PreviewTimerState,
): void {
  previewState.request += 1;
  if (previewState.timeout !== undefined) {
    clearTimeout(previewState.timeout);
    previewState.timeout = undefined;
  }
}
