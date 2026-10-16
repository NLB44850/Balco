CREATE TABLE `revoked_sessions` (
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `revoked_sessions_tokenHash` PRIMARY KEY(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `revoked_sessions_expires_index` ON `revoked_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `reminder_decisions_due_index` ON `reminder_decisions` (`status`,`scheduledFor`);