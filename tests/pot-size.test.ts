import { describe, expect, it } from "vitest";

import { POT_LITERS, POT_SIZE_CHOICES, POT_SIZE_IDS, isPotSize, potLitersOf, potSizeLabel, potSizeOf } from "../lib/plants/pot-size";

describe("taille du pot", () => {
  it("propose 5 choix, de taille croissante, « Je ne sais pas » en dernier", () => {
    expect(POT_SIZE_CHOICES.map((choice) => choice.id)).toEqual([...POT_SIZE_IDS]);
    expect(POT_SIZE_CHOICES.map((choice) => potSizeLabel(choice.id))).toEqual(["Petit (jusqu’à 20 cm)", "Moyen (21 à 30 cm)", "Grand (31 à 40 cm)", "Très grand ou bac (plus de 40 cm)", "Jardinière (60 cm, peu profonde)", "Je ne sais pas"]);
    expect(POT_LITERS.small).toBeLessThan(POT_LITERS.medium);
    expect(POT_LITERS.medium).toBeLessThan(POT_LITERS.large);
  });

  it("vaut « Je ne sais pas » pour une plante sans taille notée (plantes déjà sur le balcon)", () => {
    expect(potSizeOf({})).toBe("unknown");
    expect(potSizeOf({ potSize: null })).toBe("unknown");
    expect(potSizeOf({ potSize: "énorme" })).toBe("unknown");
    expect(potSizeOf({ potSize: "large" })).toBe("large");
  });

  it("donne un volume indicatif, sauf quand la taille n'est pas connue", () => {
    expect(potLitersOf("medium")).toBe(10);
    expect(potLitersOf("planter")).toBe(20);
    expect(potLitersOf("unknown")).toBeNull();
    expect(isPotSize("small")).toBe(true);
    expect(isPotSize(4)).toBe(false);
  });
});
