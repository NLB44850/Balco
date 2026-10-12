/**
 * La carte « Spécial pot » de la fiche d'une plante (chantier « Pots et balcon », étapes 1 et 2) : son pot (la ligne
 * qui ouvre « Dans quel pot ? », avec un mot pour dire s'il suffit), puis la fiche vérifiée : profondeur, volume,
 * terreau et engrais en culture en pot.
 */
import { SettingRow, SettingsGroup } from "@/components/settings/rows";
import type { CatalogPlant } from "@/lib/plants/catalog";
import { SOIL_LABELS, feedingDetail, feedingValue, potFit, potSheetFor } from "@/lib/plants/pot-sheet";
import { potSizeLabel, type PotSize } from "@/lib/plants/pot-size";

export function PotSheetCard({ entry, potSize, onChoosePot }: { entry: CatalogPlant; potSize: PotSize; onChoosePot: () => void }) {
  const sheet = potSheetFor(entry.id);
  if (!sheet) {
    return (
      <SettingsGroup>
        <SettingRow label="Pot" value={potSizeLabel(potSize)} onPress={onChoosePot} />
      </SettingsGroup>
    );
  }
  return (
    <SettingsGroup title="Spécial pot">
      <SettingRow label="Ton pot" value={potSizeLabel(potSize)} subtitle={potFit(sheet, potSize).text} onPress={onChoosePot} />
      <SettingRow label="Profondeur" value={`${sheet.depthCm} cm de terre`} />
      <SettingRow label="Volume" value={`${sheet.liters} L au moins`} subtitle={`Pour ${sheet.forWhat}.`} />
      <SettingRow label="Terreau" value={SOIL_LABELS[sheet.soil]} subtitle={sheet.soilTip ?? undefined} />
      <SettingRow label="Engrais" value={feedingValue(sheet.feeding)} subtitle={feedingDetail(entry, sheet.feeding)} />
    </SettingsGroup>
  );
}
