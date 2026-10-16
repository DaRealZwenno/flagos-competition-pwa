// Eigene Titelleiste (Window Controls Overlay, Chrome/Edge als installierte App).
// Damit verschwinden Vor/Zurück und der Teilen-Knopf des Browsers in der installierten App.
import { useSyncExternalStore } from "react";

type Wco = EventTarget & { visible: boolean };
const wco = (): Wco | undefined => (navigator as Navigator & { windowControlsOverlay?: Wco }).windowControlsOverlay;

function subscribeWco(cb: () => void) {
  const o = wco();
  o?.addEventListener("geometrychange", cb);
  return () => o?.removeEventListener("geometrychange", cb);
}
/** true, wenn die App die Titelleiste selbst zeichnet */
export const useTitleBarOverlay = () => useSyncExternalStore(subscribeWco, () => !!wco()?.visible, () => false);
