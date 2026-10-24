/**
 * La carte météo illustrée d'Aujourd'hui (24/10, maquette A choisie : « la météo s'affiche mieux, avec des
 * illustrations ») : le ciel à dessiner, la température, une phrase, les prochaines heures, les 3 jours suivants et
 * un conseil pour le balcon. Logique pure, à partir de la prévision d'Open-Meteo et du relevé du moteur de rappels
 * (simulation comprise).
 */
import type { WeatherSnapshot } from "@/lib/reminders/reminder-engine";
import type { OpenMeteoPayload } from "@/lib/weather/forecast-client";
import { localHour } from "@/lib/weather/snapshot";

/** Le dessin du ciel (components/weather/sky-illustration.tsx). */
export type SkyKind = "sun" | "moon" | "partly" | "partly-night" | "cloudy" | "fog" | "drizzle" | "rain" | "storm" | "snow" | "frost";

export type HourView = { label: string; kind: SkyKind; temperatureC: number; /** Risque de pluie, montré à partir de 30 %. */ rainChance?: number };
export type DayView = { label: string; kind: SkyKind; minC: number; maxC: number; rainMm: number };
export type WeatherNote = { tone: "green" | "cold" | "warm"; emoji: string; text: string };

export type ForecastView = {
  kind: SkyKind;
  temperatureC: number;
  apparentC: number;
  /** « Pluie vers 15 h », « Éclaircies », « Nuit claire »… */
  headline: string;
  minC: number;
  maxC: number;
  hours: HourView[];
  days: DayView[];
  note: WeatherNote | null;
  rainTodayMm: number;
  gustKmh: number;
};

const DRIZZLE = [51, 53, 55, 56, 57];
const RAIN = [61, 63, 65, 66, 67, 80, 81, 82];
const SNOW = [71, 73, 75, 77, 85, 86];
const STORM = [95, 96, 99];

/** Le ciel d'un code météo (WMO) ; un ciel clair sous 0 °C devient la gelée. */
export function skyKind(code: number, isDay: boolean, temperatureC?: number): SkyKind {
  if (STORM.includes(code)) return "storm";
  if (SNOW.includes(code)) return "snow";
  if (RAIN.includes(code)) return "rain";
  if (DRIZZLE.includes(code)) return "drizzle";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloudy";
  if (temperatureC !== undefined && temperatureC <= 0) return "frost";
  if (code === 1 || code === 2) return isDay ? "partly" : "partly-night";
  return isDay ? "sun" : "moon";
}

/** Ce que dit le ciel, en deux ou trois mots. */
export function skyLabel(code: number, isDay: boolean, temperatureC?: number) {
  if (STORM.includes(code)) return "Orage";
  if (SNOW.includes(code)) return "Neige";
  if (code === 66 || code === 67 || code === 56 || code === 57) return "Pluie verglaçante";
  if ([80, 81, 82].includes(code)) return "Averses";
  if (code === 65) return "Forte pluie";
  if (code === 61) return "Pluie faible";
  if (RAIN.includes(code)) return "Pluie";
  if (DRIZZLE.includes(code)) return "Bruine";
  if (code === 45 || code === 48) return "Brouillard";
  if (code === 3) return "Ciel couvert";
  if (temperatureC !== undefined && temperatureC <= 0) return "Gelée";
  if (code === 1 || code === 2) return "Éclaircies";
  return isDay ? "Ensoleillé" : "Nuit claire";
}

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isDayHour = (hour: number) => hour >= 7 && hour < 20;
const dayKey = (date: Date) => localHour(date).slice(0, 10);

type Input = {
  payload?: OpenMeteoPayload | null;
  /** Le relevé du moteur (déjà simulé en version de test) : il fait foi pour le moment présent et les nuits. */
  snapshot: WeatherSnapshot;
  isDay: boolean;
  now: Date;
  /** Une prévision gardée sur le téléphone (hors connexion) : le « maintenant » se lit dans les heures prévues. */
  stale?: boolean;
  /** Une simulation de la version de test est en cours : son ciel remplace celui des heures à venir. */
  simulated?: boolean;
};

const HOUR_OFFSETS = [0, 3, 6, 9, 12];

export function forecastView({ payload, snapshot, isDay, now, stale = false, simulated = false }: Input): ForecastView {
  const hourly = payload?.hourly ?? {};
  const daily = payload?.daily ?? {};
  const times = hourly.time;
  const startIndex = times?.length ? Math.max(0, times.findIndex((time) => time >= localHour(now))) : 0;
  const hourlyTemp = (index: number) => (finite(hourly.temperature_2m?.[index]) ? hourly.temperature_2m![index] : undefined);
  const hourlyCode = (index: number) => (finite(hourly.weather_code?.[index]) ? hourly.weather_code![index] : undefined);

  // Le moment présent : le relevé (simulé ou réel) ; hors connexion, l'heure prévue pour maintenant.
  const staleTemp = stale ? hourlyTemp(startIndex) : undefined;
  const staleCode = stale ? hourlyCode(startIndex) : undefined;
  const temperatureC = simulated || staleTemp === undefined ? snapshot.current.temperatureC : staleTemp;
  const code = simulated || staleCode === undefined ? snapshot.current.weatherCode : staleCode;
  const apparentC = stale && !simulated ? temperatureC : snapshot.current.apparentTemperatureC;
  const shift = simulated ? snapshot.current.temperatureC - (hourlyTemp(startIndex) ?? snapshot.current.temperatureC) : 0;

  const hours: HourView[] = [];
  if (hourly.temperature_2m?.length) {
    for (const offset of HOUR_OFFSETS) {
      const index = startIndex + offset;
      const raw = offset === 0 ? temperatureC : hourlyTemp(index);
      if (raw === undefined) break;
      const hour = times?.[index] ? Number(times[index].slice(11, 13)) : (now.getHours() + offset) % 24;
      const day = finite(hourly.is_day?.[index]) ? hourly.is_day![index] === 1 : isDayHour(hour);
      const temp = offset === 0 ? temperatureC : raw + shift;
      const hourCode = simulated || offset === 0 ? code : hourlyCode(index) ?? code;
      const chance = simulated ? (snapshot.next12h.precipitationProbabilityMax >= 30 ? snapshot.next12h.precipitationProbabilityMax : undefined) : hourly.precipitation_probability?.[index];
      hours.push({
        label: offset === 0 ? "Maint." : `${hour} h`,
        kind: skyKind(hourCode, offset === 0 ? isDay : day, temp),
        temperatureC: Math.round(temp),
        rainChance: finite(chance) && chance >= 30 ? Math.round(chance) : undefined,
      });
    }
  }

  // Les 3 jours suivants : le jour d'aujourd'hui retrouvé dans la prévision (une copie gardée a glissé).
  const today = dayKey(now);
  const dayIndex = daily.time?.length ? Math.max(0, daily.time.indexOf(today)) : 0;
  const days: DayView[] = [];
  if (daily.weather_code?.length) {
    for (let offset = 1; offset <= 3; offset += 1) {
      const index = dayIndex + offset;
      const dayCode = daily.weather_code[index];
      const min = simulated && finite(snapshot.nights?.[offset]) ? snapshot.nights![offset] : daily.temperature_2m_min?.[index];
      const max = daily.temperature_2m_max?.[index];
      if (!finite(dayCode) || !finite(min) || !finite(max)) break;
      const date = daily.time?.[index] ? new Date(`${daily.time[index]}T12:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
      const kind = skyKind(simulated ? code : dayCode, true);
      days.push({
        label: offset === 1 ? "Demain" : WEEKDAYS[date.getDay()],
        // Une nuit sous 0 °C sans pluie ni neige : la gelée.
        kind: min <= 0 && (kind === "sun" || kind === "partly") ? "frost" : kind,
        minC: Math.round(Math.min(min, max)),
        maxC: Math.round(max),
        rainMm: Math.round((daily.precipitation_sum?.[index] ?? 0) * 10) / 10,
      });
    }
  }

  return {
    kind: skyKind(code, isDay, temperatureC),
    temperatureC: Math.round(temperatureC),
    apparentC: Math.round(apparentC),
    headline: headlineFor({ code, isDay, temperatureC, payload, startIndex, simulated, snapshot }),
    minC: Math.round(Math.min(snapshot.today.temperatureMinC, temperatureC)),
    maxC: Math.round(Math.max(snapshot.today.temperatureMaxC, temperatureC)),
    hours,
    days,
    note: weatherNote(snapshot, now, days),
    rainTodayMm: Math.round(snapshot.today.precipitationMm * 10) / 10,
    gustKmh: Math.round(snapshot.next12h.windGustKmhMax),
  };
}

/** « Pluie vers 15 h » quand elle arrive dans les 12 heures, sinon ce que dit le ciel. */
function headlineFor({ code, isDay, temperatureC, payload, startIndex, simulated, snapshot }: { code: number; isDay: boolean; temperatureC: number; payload?: OpenMeteoPayload | null; startIndex: number; simulated: boolean; snapshot: WeatherSnapshot }) {
  const now = skyLabel(code, isDay, temperatureC);
  if ([...RAIN, ...DRIZZLE, ...SNOW, ...STORM].includes(code)) return now;
  const hourly = payload?.hourly;
  if (!simulated && hourly?.precipitation_probability && hourly.precipitation) {
    for (let offset = 1; offset <= 12; offset += 1) {
      const index = startIndex + offset;
      if ((hourly.precipitation_probability[index] ?? 0) >= 50 && (hourly.precipitation[index] ?? 0) >= 0.2) {
        const hour = hourly.time?.[index] ? Number(hourly.time[index].slice(11, 13)) : undefined;
        return hour === undefined ? "Pluie dans la journée" : `Pluie vers ${hour} h`;
      }
    }
  } else if (simulated && snapshot.next12h.precipitationMm >= 1) {
    return "Pluie dans les prochaines heures";
  }
  return now;
}

/** Une phrase pour le balcon, la plus utile d'abord (orage, gel, vent, chaleur, pluie, gel à venir). */
export function weatherNote(snapshot: WeatherSnapshot, now: Date, days: DayView[] = []): WeatherNote | null {
  if (STORM.includes(snapshot.current.weatherCode)) return { tone: "warm", emoji: "⛈️", text: "Orage : mets les pots légers et les jeunes plants à l’abri." };
  const nights = snapshot.nights?.length ? snapshot.nights : [snapshot.today.temperatureMinC];
  // nights[0] : le petit matin d'aujourd'hui (déjà passé l'après-midi) ; nights[1] : la nuit qui vient.
  const frostSoon = (now.getHours() < 10 && nights[0] <= 0) || (nights[1] ?? nights[0]) <= 0;
  if (frostSoon) return { tone: "cold", emoji: "❄️", text: `Gel cette nuit (${Math.round(Math.min(...nights.slice(0, 2)))}°) : protège tes plantes frileuses.` };
  if (snapshot.next12h.windGustKmhMax >= 50) return { tone: "warm", emoji: "💨", text: `Coup de vent (${Math.round(snapshot.next12h.windGustKmhMax)} km/h) : rapproche les pots du mur.` };
  if (snapshot.today.temperatureMaxC >= 30) return { tone: "warm", emoji: "☀️", text: "Forte chaleur : arrose tôt le matin ou le soir, jamais en plein soleil." };
  if (snapshot.next12h.precipitationMm >= 3) return { tone: "green", emoji: "🌧️", text: "La pluie arrose à ta place : vérifie juste les pots à l’abri du balcon." };
  const later = nights.findIndex((value, index) => index >= 2 && value <= 0);
  if (later >= 2 && later <= 3) {
    const day = days[later - 1]?.label ?? WEEKDAYS[new Date(now.getFullYear(), now.getMonth(), now.getDate() + later).getDay()];
    return { tone: "cold", emoji: "❄️", text: `Gel possible ${day.toLowerCase()} au petit matin : Balco te préviendra la veille.` };
  }
  return null;
}
