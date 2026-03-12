CREATE TABLE `extra_manual` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(10) NOT NULL,
	`mesId` int NOT NULL,
	`extraManualCentimos` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extra_manual_id` PRIMARY KEY(`id`)
);
