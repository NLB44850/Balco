import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReminderDecision } from "@/lib/reminders/reminder-engine";

type GroupedReminderCardProps = {
  decisions: ReminderDecision[];
  onComplete: (decision: ReminderDecision) => void;
  onDismiss: (decisions: ReminderDecision[]) => void;
};

export function GroupedReminderCard({ decisions, onComplete, onDismiss }: GroupedReminderCardProps) {
  if (decisions.length === 0) return null;
  const urgent = decisions.some((decision) => decision.priority === "urgent");
  const skipped = decisions.every((decision) => decision.action === "skip");
  const first = decisions[0];

  return (
    <View style={[styles.card, urgent && styles.urgentCard]} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={[styles.dot, urgent ? styles.urgentDot : skipped ? styles.skipDot : styles.normalDot]} />
        <Text style={styles.label}>{decisions.length > 1 ? `${decisions.length} CONSEILS POUR TON BALCON` : "CONSEIL DU JOUR"}</Text>
        <Text style={styles.action}>{urgent ? "PRIORITÉ" : first.taskType.toUpperCase()}</Text>
      </View>
      <Text style={styles.title}>{decisions.length > 1 ? "Un même geste, plusieurs plantes." : first.title}</Text>
      <Text style={styles.body}>{decisions.length > 1 ? "Balco a repéré le même besoin météo sur plusieurs plantes." : first.body}</Text>
      <View style={styles.list}>
        {decisions.map((decision) => (
          <View key={`${decision.plantId}:${decision.taskType}`} style={styles.item}>
            <View style={styles.itemCopy}><Text style={styles.itemTitle}>{decision.title}</Text><Text style={styles.itemReason}>{decision.reason}</Text></View>
            {!skipped && <Pressable accessibilityRole="button" accessibilityLabel={`Valider ${decision.title}`} onPress={() => onComplete(decision)} style={({ pressed }) => [styles.itemButton, pressed && styles.pressed]}><Text style={styles.itemButtonText}>Fait</Text></Pressable>}
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer les rappels groupés" onPress={() => onDismiss(decisions)} style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}><Text style={styles.dismissText}>{skipped ? "Compris" : "Plus tard"}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, borderColor: "#D8E3D6", backgroundColor: "#F7FAF2", padding: 18, gap: 10 },
  urgentCard: { borderColor: "#D99A72", backgroundColor: "#FFF5EA" },
  header: { alignItems: "center", flexDirection: "row", gap: 8 },
  dot: { borderRadius: 99, height: 9, width: 9 },
  normalDot: { backgroundColor: "#6C9B65" },
  skipDot: { backgroundColor: "#D29A45" },
  urgentDot: { backgroundColor: "#C96655" },
  label: { color: "#477151", flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  action: { color: "#7D8B78", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: "#203A2B", fontSize: 20, fontWeight: "800", lineHeight: 26 },
  body: { color: "#496254", fontSize: 14, lineHeight: 20 },
  list: { gap: 7, marginTop: 2 },
  item: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.65)", borderRadius: 14, flexDirection: "row", gap: 8, padding: 10 },
  itemCopy: { flex: 1 },
  itemTitle: { color: "#203A2B", fontSize: 12, fontWeight: "800", lineHeight: 16 },
  itemReason: { color: "#7D8B78", fontSize: 10, lineHeight: 14, marginTop: 2 },
  itemButton: { backgroundColor: "#2F644B", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  itemButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  dismissButton: { alignSelf: "flex-start", borderColor: "#C9D6C8", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  dismissText: { color: "#477151", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});

export default GroupedReminderCard;
