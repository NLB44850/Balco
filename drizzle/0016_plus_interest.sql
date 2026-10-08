CREATE TABLE `plus_interest` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plus_interest_id` PRIMARY KEY(`id`),
	CONSTRAINT `plus_interest_user_unique` UNIQUE(`userId`),
	CONSTRAINT `plus_interest_email_unique` UNIQUE(`email`)
);
