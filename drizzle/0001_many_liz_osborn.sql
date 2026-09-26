CREATE TABLE `maintenance_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` varchar(128) NOT NULL,
	`plantId` varchar(128) NOT NULL,
	`type` varchar(32) NOT NULL,
	`completedAt` timestamp NOT NULL,
	`source` varchar(32) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenance_events_user_event_unique` UNIQUE(`userId`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `reminder_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`decisionKey` varchar(255) NOT NULL,
	`plantId` varchar(128) NOT NULL,
	`taskType` varchar(32) NOT NULL,
	`action` varchar(32) NOT NULL,
	`priority` varchar(32) NOT NULL,
	`payload` text NOT NULL,
	`validUntil` timestamp NOT NULL,
	`weatherFetchedAt` timestamp NOT NULL,
	`scheduledFor` timestamp,
	`sentAt` timestamp,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminder_decisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_decisions_user_key_unique` UNIQUE(`userId`,`decisionKey`)
);
--> statement-breakpoint
CREATE TABLE `reminder_plants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plantId` varchar(128) NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`profileJson` text NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_plants_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_plants_user_plant_unique` UNIQUE(`userId`,`plantId`)
);
--> statement-breakpoint
CREATE TABLE `reminder_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`city` varchar(128) NOT NULL DEFAULT 'Paris',
	`latitude` double NOT NULL DEFAULT 48.8566,
	`longitude` double NOT NULL DEFAULT 2.3522,
	`timezone` varchar(64) NOT NULL DEFAULT 'Europe/Paris',
	`preferredHour` int NOT NULL DEFAULT 18,
	`preferredMinute` int NOT NULL DEFAULT 30,
	`quietStartHour` int NOT NULL DEFAULT 21,
	`quietEndHour` int NOT NULL DEFAULT 9,
	`skipWateringWhenRainExpected` int NOT NULL DEFAULT 1,
	`maxNormalRemindersPerDay` int NOT NULL DEFAULT 1,
	`enabledPlantIds` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `maintenance_events_user_date_index` ON `maintenance_events` (`userId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `reminder_decisions_user_status_index` ON `reminder_decisions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `reminder_plants_user_index` ON `reminder_plants` (`userId`);