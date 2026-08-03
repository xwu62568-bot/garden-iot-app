import { publicAsset } from "../publicAsset";

export const mobileAssets = {
  iphoneBezel: publicAsset("assets/iphone/Bezel.png"),
  iphoneKeyboard: publicAsset("assets/iphone/Keyboard.png"),
  androidKeyboard: publicAsset("assets/android/Keyboard.png"),
  pixel10Bezel: publicAsset("assets/android/Pixel10.png"),
} as const;
