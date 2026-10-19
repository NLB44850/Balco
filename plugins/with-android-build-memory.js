// Réglages de construction Android (19/10) : la construction sur les machines de GitHub manquait de mémoire
// (« OutOfMemoryError: Metaspace »). Plus de mémoire pour Gradle, et pas d'analyse « lint » des versions publiées
// (longue et gourmande, sans effet sur l'app). Rien ne change dans l'app elle-même.
const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

const JVM_ARGS = "-Xmx6g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8";

module.exports = function withAndroidBuildMemory(config) {
  config = withGradleProperties(config, (next) => {
    next.modResults = next.modResults.filter((item) => !(item.type === "property" && item.key === "org.gradle.jvmargs"));
    next.modResults.push({ type: "property", key: "org.gradle.jvmargs", value: JVM_ARGS });
    return next;
  });
  return withAppBuildGradle(config, (next) => {
    if (!next.modResults.contents.includes("checkReleaseBuilds false")) {
      next.modResults.contents = next.modResults.contents.replace(/android\s*\{/, (match) => `${match}\n    lint {\n        checkReleaseBuilds false\n    }`);
    }
    return next;
  });
};
