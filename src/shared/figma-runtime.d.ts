// Small compile-time compatibility surface. Runtime objects are supplied by Figma.
type Effect = Record<string, unknown>;
type SceneNode = {
  id: string;
  name: string;
  type: string;
  removed: boolean;
  width: number;
  height: number;
  effects?: readonly Effect[];
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
  setRelaunchData(data: Record<string, string>): void;
  clipsContent?: boolean;
  fills?: readonly { visible?: boolean; opacity?: number }[];
  createCanvasControl?: (options: unknown) => unknown;
};
type FrameNode = SceneNode;
declare const __html__: string;
declare const figma: {
  currentPage: { selection: SceneNode[] };
  root: { setRelaunchData(data: Record<string, string>): void };
  clientStorage: {
    getAsync(key: string): Promise<unknown>;
    setAsync(key: string, value: unknown): Promise<void>;
  };
  ui: {
    postMessage(value: unknown): void;
    onmessage: ((value: any) => void) | null;
  };
  showUI(html: string, options?: Record<string, unknown>): void;
  on(name: string, callback: () => void): void;
  notify(text: string, options?: { error?: boolean }): void;
};
