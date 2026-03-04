CREATE TABLE `colaboradores_excluidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(10) NOT NULL,
	`nome` varchar(100),
	`motivo` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `colaboradores_excluidos_id` PRIMARY KEY(`id`),
	CONSTRAINT `colaboradores_excluidos_numero_unique` UNIQUE(`numero`)
);
