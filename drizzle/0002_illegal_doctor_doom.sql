CREATE TABLE `horarios_custom` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(10) NOT NULL,
	`nome` varchar(100),
	`en1` int,
	`sa1` int,
	`en2` int,
	`sa2` int,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `horarios_custom_id` PRIMARY KEY(`id`),
	CONSTRAINT `horarios_custom_numero_unique` UNIQUE(`numero`)
);
