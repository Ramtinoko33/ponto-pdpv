CREATE TABLE `meses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ano` int NOT NULL,
	`mes` int NOT NULL,
	`label` varchar(20) NOT NULL,
	`totalRegistos` int NOT NULL DEFAULT 0,
	`totalColaboradores` int NOT NULL DEFAULT 0,
	`saldoGeral` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registos_diarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesId` int NOT NULL,
	`numero` varchar(10) NOT NULL,
	`nome` varchar(100) NOT NULL,
	`data` varchar(20) NOT NULL,
	`diaSemana` varchar(10),
	`horario` varchar(20),
	`en1` varchar(8),
	`sa1` varchar(8),
	`en2` varchar(8),
	`sa2` varchar(8),
	`en1Auto` int NOT NULL DEFAULT 0,
	`sa1Auto` int NOT NULL DEFAULT 0,
	`en2Auto` int NOT NULL DEFAULT 0,
	`sa2Auto` int NOT NULL DEFAULT 0,
	`cenario` varchar(20),
	`saldo` int,
	`atrasoEn` int NOT NULL DEFAULT 0,
	`excessoAlm` int NOT NULL DEFAULT 0,
	`saidaCedo` int NOT NULL DEFAULT 0,
	`extraSa` int NOT NULL DEFAULT 0,
	`justificacao` varchar(100),
	`detalhe` text,
	`ignorada` int NOT NULL DEFAULT 0,
	CONSTRAINT `registos_diarios_id` PRIMARY KEY(`id`)
);
