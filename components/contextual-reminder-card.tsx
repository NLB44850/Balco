import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReminderSnooze } from "@/lib/reminders/reminder-actions";
import type { ReminderDecision } from "@/lib/reminders/reminder-engine";

type ContextualReminderCardProps = {
  decision: ReminderDecision | null;
  onComplete?: (decision: ReminderDecision) => void;
  /** « Dans 3 h » (later) ou « Pas aujourd'hui » (skip). */
  onSnooze?: (decision: ReminderDecision, kind: ReminderSnooze["kind"]) => void;
};

export const TASK_LABELS: Record<ReminderDecision["taskType"], string> = {
  watering: "ARROSAGE",
  observation: "OBSERVATION",
  pruning: "ENTRETIEN",
  protection: "PROTECTION",
  harvest: "RÉCOLTE",
};

const priorityLabels: Record<ReminderDecision["priority"], string> = {
  normal: "CONSEIL DU JOUR",
  important: "À FAIRE BIENTÔT",
  urgent: "À PROTÉGER",
};

export function ContextualReminderCard({ decision, onComplete, onSnooze }: ContextualReminderCardProps) {
  if (!decision) return null;

  const isSkip = decision.action === "skip";
  const isUrgent = decision.priority === "urgent";

  return (
    <View style={[styles.card, isUrgent && styles.urgentCard]} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={[styles.dot, isUrgent ? styles.urgentDot : isSkip ? styles.skipDot : styles.normalDot]} />
        <Text style={styles.label}>{priorityLabels[decision.priority]}</Text>
        <Text style={styles.action}>{decision.action === "protect" ? "PROTECTION" : TASK_LABELS[decision.taskType]}</Text>
      </View>

      <Text style={styles.title}>{decision.title}</Text>
      <Text style={styles.body}>{decision.body}</Text>
      <Text style={styles.reason}>Pourquoi ce conseil : {decision.reason}</Text>

      <View style={styles.actions}>
        {!isSkip && onComplete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fait : ${decision.title}`}
            onPress={() => onComplete(decision)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Fait ✓</Text>
          </Pressable>
        ) : null}
        {!isSkip && onSnooze ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Me le rappeler dans 3 heures"
            onPress={() => onSnooze(decision, "later")}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Dans 3 h</Text>
          </Pressable>
        ) : null}
        {onSnooze ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSkip ? "Compris" : "Pas aujourd’hui"}
            onPress={() => onSnooze(decision, "skip")}
            style={({ pressed }) => [isSkip ? styles.primaryButton : styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={isSkip ? styles.primaryButtonText : styles.secondaryButtonText}>{isSkip ? "Compris" : "Pas aujourd’hui"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D8E3D6",
    backgroundColor: "#F7FAF2",
    padding: 18,
    gap: 10,
  },
  urgentCard: {
    borderColor: "#D99A72",
    backgroundColor: "#FFF5EA",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    borderRadius: 99,
    height: 9,
    width: 9,
  },
  normalDot: { backgroundColor: "#6C9B65" },
  skipDot: { backgroundColor: "#D29A45" },
  urgentDot: { backgroundColor: "#C96655" },
  label: {
    color: "#477151",
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  action: {
    color: "#7D8B78",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: "#203A2B",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 27,
  },
  body: {
    color: "#496254",
    fontSize: 14,
    lineHeight: 21,
  },
  reason: {
    color: "#7D8B78",
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2F644B",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#C9D6C8",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#477151",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});

export default ContextualReminderCard;
