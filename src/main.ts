import { CommandHandler } from "./application/command-handler";
import type { UIToPlugin } from "./shared/messages";
const handler = new CommandHandler();
figma.showUI(__html__, { width: 360, height: 640, themeColors: true });
figma.on("selectionchange", () => handler.onSelectionChange());
figma.on("close", () => handler.cancel());
// Serial execution avoids overlapping Figma writes from consecutive UI messages.
let queue = Promise.resolve();
figma.ui.onmessage = (msg: UIToPlugin) => {
  queue = queue
    .then(() => handler.handle(msg))
    .catch((error) => figma.notify(String(error), { error: true }));
};
void handler.initialize();
