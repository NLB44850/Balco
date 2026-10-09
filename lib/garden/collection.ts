/**
 * La collection dans Moi : « Presque là » (les badges les plus proches, avec une phrase), la saison en cours, l'herbier
 * et tous les badges obtenus (permanents, saisons passées, événements). Logique pure.
 */
import { eventBadgeTitle, eventById } from "../events/events";
import { TIER_NAMES, type Badge } from "./garden-logic";
import { seasonBadgeTitle, seasonOf, seasonRuleById, type SeasonBadge } from "./season-badges";

export type AlmostItem = { key: string; icon: string; title: string; current: number; target: number; phrase: string };

/** Les 3 badges (paliers ou saison en cours) les plus proches, ceux déjà commencés d'abord. */
export function almostThere(badges: Badge[], season: SeasonBadge[], count = 3): AlmostItem[] {
  const items: AlmostItem[] = [
    ...badges.filter((badge) => badge.tier < 3).map((badge) => ({
      key: badge.id,
      icon: badge.icon,
      title: badge.tier === 0 ? badge.title : `${badge.title} · palier ${TIER_NAMES[badge.tier as 0 | 1 | 2]}`,
      current: badge.current,
      target: badge.target,
      phrase: `Encore ${badge.unit(badge.target - badge.current)}`,
    })),
    ...season.filter((badge) => !badge.obtained && !badge.awardKey).map((badge) => ({
      key: badge.key,
      icon: badge.emoji,
      title: seasonBadgeTitle(badge, badge.year),
      current: badge.current,
      target: badge.target,
      phrase: `Encore ${badge.unit(badge.target - badge.current)} d’ici la fin de la saison`,
    })),
  ];
  const ratio = (item: AlmostItem) => item.current / item.target;
  return items.sort((a, b) => Number(b.current > 0) - Number(a.current > 0) || ratio(b) - ratio(a) || a.target - b.target).slice(0, count);
}

export type ObtainedBadge = { key: string; icon: string; title: string; detail: string; at: string };

/** Les badges des saisons passées et des événements, avec leur millésime, du plus récent au plus ancien. */
export function pastSeasonBadges(awards: Record<string, string>, now: Date): ObtainedBadge[] {
  const current = seasonOf(now);
  return Object.entries(awards).flatMap(([key, at]): ObtainedBadge[] => {
    const [scope, id, yearText] = key.split(":");
    const year = Number(yearText);
    if (scope === "event") {
      const event = eventById(id);
      return event ? [{ key, icon: event.emoji, title: eventBadgeTitle(event, year), detail: event.badge.detail, at }] : [];
    }
    if (scope !== "season") return [];
    const rule = seasonRuleById(id);
    // La saison en cours a sa propre section.
    if (!rule || (rule.season === current.season && year === current.year)) return [];
    return [{ key, icon: rule.emoji, title: seasonBadgeTitle(rule, year), detail: rule.unit(rule.target), at }];
  }).sort((a, b) => b.at.localeCompare(a.at));
}
