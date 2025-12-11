DELETE FROM "settings";

ALTER TABLE "settings" DROP COLUMN "id";
ALTER TABLE "settings" ADD COLUMN "guild_id" varchar PRIMARY KEY NOT NULL;