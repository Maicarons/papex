-- Category name/description bilingual i18n (zh) columns.
-- `name`/`description` remain the English canonical values; the new columns
-- hold Simplified-Chinese translations used when the active locale is `zh`.
ALTER TABLE "categories" ADD COLUMN "name_zh" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description_zh" text;
