/** Les ombres peintes de chaque famille de plantes (scripts/art/ombres-balcon.mjs) : sur le balcon et en attendant ta photo. */
import type { ImageSourcePropType } from "react-native";

import type { PotShape } from "@/lib/garden/sky";

export const PLANT_SHADOWS: Record<PotShape, ImageSourcePropType> = {
  bush: require("@/assets/images/balcony/plant-bush.png"),
  tall: require("@/assets/images/balcony/plant-tall.png"),
  flower: require("@/assets/images/balcony/plant-flower.png"),
  leafy: require("@/assets/images/balcony/plant-leafy.png"),
  berry: require("@/assets/images/balcony/plant-berry.png"),
  sprout: require("@/assets/images/balcony/plant-sprout.png"),
};
