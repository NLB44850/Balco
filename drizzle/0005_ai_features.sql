CREATE TABLE `ai_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(16) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`model` varchar(64),
	`inputTokens` int,
	`outputTokens` int,
	`cacheReadTokens` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` varchar(16) DEFAULT 'free' NOT NULL;--> statement-breakpoint
CREATE INDEX `ai_requests_user_kind_date_index` ON `ai_requests` (`userId`,`kind`,`createdAt`);