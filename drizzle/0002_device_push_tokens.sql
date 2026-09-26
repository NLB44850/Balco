CREATE TABLE `device_push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` varchar(16) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_push_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `device_push_tokens_user_index` ON `device_push_tokens` (`userId`);