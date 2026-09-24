CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`autor_id` integer,
	`acao` text NOT NULL,
	`recurso` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`aceito` integer NOT NULL,
	`versao` text NOT NULL,
	`finalidade` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`unidade_id` integer NOT NULL,
	`produto_id` integer NOT NULL,
	`preco_centavos` integer NOT NULL,
	`quantidade` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`unidade_id`, `produto_id`),
	FOREIGN KEY (`unidade_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`produto_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_nonnegative" CHECK("inventory"."quantidade" >= 0),
	CONSTRAINT "price_positive" CHECK("inventory"."preco_centavos" > 0)
);
--> statement-breakpoint
CREATE TABLE `loyalty_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`pedido_id` integer,
	`pontos` integer NOT NULL,
	`motivo` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pedido_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`produto_id` integer NOT NULL,
	`quantidade` integer NOT NULL,
	`preco_centavos` integer NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`produto_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_quantity" CHECK("order_items"."quantidade" > 0),
	CONSTRAINT "item_price" CHECK("order_items"."preco_centavos" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_product` ON `order_items` (`pedido_id`,`produto_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`unidade_id` integer NOT NULL,
	`canal_pedido` text NOT NULL,
	`status` text NOT NULL,
	`subtotal_centavos` integer NOT NULL,
	`desconto_centavos` integer DEFAULT 0 NOT NULL,
	`total_centavos` integer NOT NULL,
	`pontos_resgatados` integer DEFAULT 0 NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unidade_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_channel" CHECK("orders"."canal_pedido" IN ('APP','TOTEM','BALCAO','PICKUP','WEB')),
	CONSTRAINT "order_status" CHECK("orders"."status" IN ('AGUARDANDO_PAGAMENTO','EM_PREPARO','PRONTO','ENTREGUE','CANCELADO')),
	CONSTRAINT "order_total" CHECK("orders"."total_centavos" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_idempotency` ON `orders` (`cliente_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_channel_status` ON `orders` (`canal_pedido`,`status`,`id`);--> statement-breakpoint
CREATE INDEX `orders_client` ON `orders` (`cliente_id`,`id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`cenario` text NOT NULL,
	`valor_centavos` integer NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_status" CHECK("payments"."status" IN ('PROCESSANDO','APROVADO','RECUSADO','ERRO'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_key_unique` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `payments_order` ON `payments` (`pedido_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unidade_id` integer NOT NULL,
	`produto_id` integer NOT NULL,
	`pedido_id` integer,
	`autor_id` integer NOT NULL,
	`quantidade` integer NOT NULL,
	`motivo` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unidade_id`,`produto_id`) REFERENCES `inventory`(`unidade_id`,`produto_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movement_nonzero" CHECK("stock_movements"."quantidade" <> 0)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`cidade` text NOT NULL,
	`ativa` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`perfil` text NOT NULL,
	`consentimento` integer DEFAULT 0 NOT NULL,
	`pontos` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT "users_role" CHECK("users"."perfil" IN ('CLIENTE','ATENDENTE','COZINHA','GERENTE','ADMIN')),
	CONSTRAINT "users_points" CHECK("users"."pontos" >= 0),
	CONSTRAINT "users_consent" CHECK("users"."consentimento" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);