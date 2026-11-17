ALTER TABLE "checklist_items" ADD COLUMN "is_essential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "checklist_items" ADD COLUMN "assigned_to_user_id" UUID;
CREATE INDEX "checklist_items_assigned_to_user_id_idx" ON "checklist_items"("assigned_to_user_id");
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
