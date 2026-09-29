CREATE TABLE `nora_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferencesJson` text,
	`notesJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nora_memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `nora_memories_user_unique` UNIQUE(`userId`)
);
