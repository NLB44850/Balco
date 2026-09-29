import { Redirect } from "expo-router";

/** L'ancienne adresse « Mon balcon » mène maintenant à l'onglet Balcon. */
export default function GardenIndexRedirect() {
  return <Redirect href="/(tabs)/balcony" />;
}
