CREATE TABLE `rate_limits` (
	`bucket` varchar(128) NOT NULL,
	`windowStart` timestamp NOT NULL,
	`hits` int NOT NULL DEFAULT 0,
	CONSTRAINT `rate_limits_pk` PRIMARY KEY(`bucket`,`windowStart`)
);
--> statement-breakpoint
CREATE INDEX `rate_limits_window_index` ON `rate_limits` (`windowStart`);