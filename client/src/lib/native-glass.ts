import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeGlassPlugin {
  showTabBarGlass(options: { height: number }): Promise<void>;
  hide(): Promise<void>;
}

export const NativeGlass = registerPlugin<NativeGlassPlugin>("NativeGlass");

export function isNativeGlassAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
