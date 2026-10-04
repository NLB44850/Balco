CREATE TABLE `job_locks` (
	`name` varchar(64) NOT NULL,
	`owner` varchar(64) NOT NULL,
	`lockedUntil` timestamp NOT NULL,
	CONSTRAINT `job_locks_name` PRIMARY KEY(`name`)
);
