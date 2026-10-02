ALTER TABLE `reminder_plants` ADD `catalogId` varchar(64);--> statement-breakpoint
ALTER TABLE `reminder_plants` ADD `nickname` varchar(128);--> statement-breakpoint
ALTER TABLE `reminder_plants` ADD `addedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reminder_plants` ADD `removedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reminder_plants` ADD `clientUpdatedAt` timestamp(3);--> statement-breakpoint
ALTER TABLE `reminder_profiles` ADD `locationUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reminder_profiles` ADD `firstName` varchar(64);--> statement-breakpoint
ALTER TABLE `reminder_profiles` ADD `balconyJson` text;