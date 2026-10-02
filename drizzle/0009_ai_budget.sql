ALTER TABLE `ai_requests` ADD `cacheWriteTokens` int;--> statement-breakpoint
CREATE INDEX `ai_requests_date_index` ON `ai_requests` (`createdAt`);