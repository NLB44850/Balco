import { StyleSheet } from "react-native";

/** Les cartes posées sur la lumière du balcon : blanc translucide, bord à peine visible. */
export const glass = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.74)", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(18,22,20,0.10)" },
  soft: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 14 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(18,22,20,0.10)" },
});
