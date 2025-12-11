CREATE TABLE "quotes" (
	"UUID" varchar PRIMARY KEY NOT NULL,
	"guildId" varchar NOT NULL,
	"person" varchar NOT NULL,
	"quote" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"history_length" integer DEFAULT 5 NOT NULL
);
