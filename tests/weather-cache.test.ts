/**
 * Météo servie par le serveur, en cache par zone (server/weather-cache.ts), et prévision partagée
 * par les écrans de l'app, avec repli sur Open-Meteo (lib/weather/forecast-client.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("@/constants/api", () => ({ getApiBaseUrl: () => "https://api.balco.test" }));

const PAYLOAD = { current: { temperature_2m: 18, weather_code: 1, is_day: 1 }, daily: { precipitation_sum: [0, 0] } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const urlOf = (input: unknown) => String(input instanceof Request ? input.url : input);

describe("cache météo du serveur", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn(() => Promise.resolve(json(PAYLOAD)));
    vi.stubGlobal("fetch", fetchMock);
    (await import("../server/weather-cache")).clearWeatherCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("un seul appel à Open-Meteo par zone d'environ 1 km, pendant 30 minutes", async () => {
    const { forecastFor } = await import("../server/weather-cache");
    const now = Date.UTC(2026, 9, 4, 12);
    expect(await forecastFor(48.8566, 2.3522, now)).toMatchObject({ payload: PAYLOAD, cached: false, zone: "48.86,2.35" });
    // Un voisin à quelques centaines de mètres, 20 minutes plus tard : même prévision.
    expect(await forecastFor(48.8581, 2.3489, now + 20 * 60_000)).toMatchObject({ cached: true, zone: "48.86,2.35" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Open-Meteo reçoit les coordonnées arrondies, pas la position exacte.
    expect(urlOf(fetchMock.mock.calls[0][0])).toContain("latitude=48.86&longitude=2.35");
    // Après 30 minutes, la prévision est redemandée.
    expect(await forecastFor(48.8566, 2.3522, now + 31 * 60_000)).toMatchObject({ cached: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("partage l'appel entre deux demandes simultanées et ne garde pas un échec", async () => {
    const { forecastFor, isForecastCached } = await import("../server/weather-cache");
    const now = Date.UTC(2026, 9, 4, 12);
    await Promise.all([forecastFor(45.76, 4.84, now), forecastFor(45.761, 4.841, now)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementationOnce(() => Promise.resolve(json({ error: true }, 503)));
    await expect(forecastFor(43.6, 1.44, now)).rejects.toThrow("503");
    expect(isForecastCached(43.6, 1.44, now)).toBe(false);
    await expect(forecastFor(43.6, 1.44, now)).resolves.toMatchObject({ cached: false });
  });

  it("refuse des coordonnées impossibles", async () => {
    const { isValidCoordinate } = await import("../server/weather-cache");
    expect(isValidCoordinate(48.85, 2.35)).toBe(true);
    expect(isValidCoordinate(Number.NaN, 2.35)).toBe(false);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
  });
});

describe("prévision partagée par les écrans de l'app", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn(() => Promise.resolve(json(PAYLOAD)));
    vi.stubGlobal("fetch", fetchMock);
    (await import("../lib/weather/forecast-client")).clearForecastCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("demande au serveur Balco une seule fois pour Aujourd'hui et Saisons", async () => {
    const { loadForecastPayload } = await import("../lib/weather/forecast-client");
    const now = Date.UTC(2026, 9, 4, 12);
    const [today, seasons] = await Promise.all([loadForecastPayload(48.8566, 2.3522, { now }), loadForecastPayload(48.8566, 2.3522, { now: now + 1000 })]);
    expect(today).toEqual(PAYLOAD);
    expect(seasons).toEqual(PAYLOAD);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf(fetchMock.mock.calls[0][0])).toBe("https://api.balco.test/api/weather?latitude=48.8566&longitude=2.3522");
    // Tirer pour rafraîchir redemande.
    await loadForecastPayload(48.8566, 2.3522, { now: now + 2000, force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("appelle Open-Meteo directement quand le serveur ne répond pas", async () => {
    const { loadForecastPayload } = await import("../lib/weather/forecast-client");
    fetchMock.mockImplementation((input: unknown) => (urlOf(input).includes("api.balco.test") ? Promise.reject(new Error("offline")) : Promise.resolve(json(PAYLOAD))));
    expect(await loadForecastPayload(45.76, 4.84)).toEqual(PAYLOAD);
    expect(urlOf(fetchMock.mock.calls[1][0])).toContain("https://api.open-meteo.com/v1/forecast?latitude=45.76&longitude=4.84");
  });

  it("ne garde pas un échec : l'écran suivant réessaie", async () => {
    const { loadForecastPayload } = await import("../lib/weather/forecast-client");
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    await expect(loadForecastPayload(43.6, 1.44)).rejects.toThrow();
    fetchMock.mockImplementation(() => Promise.resolve(json(PAYLOAD)));
    expect(await loadForecastPayload(43.6, 1.44)).toEqual(PAYLOAD);
  });
});
