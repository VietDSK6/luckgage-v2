ALTER TABLE "checklist_items" ADD COLUMN "packed_changed_by_user_id" UUID;
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_packed_changed_by_user_id_fkey" FOREIGN KEY ("packed_changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
