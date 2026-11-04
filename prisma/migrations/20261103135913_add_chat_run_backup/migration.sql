-- CreateTable
CREATE TABLE "chat_run_backups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "client_run_id" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_run_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_run_backups_client_run_id_key" ON "chat_run_backups"("client_run_id");

-- CreateIndex
CREATE INDEX "chat_run_backups_user_id_conversation_id_idx" ON "chat_run_backups"("user_id", "conversation_id");

-- CreateIndex
CREATE INDEX "chat_run_backups_user_id_conversation_id_updated_at_idx" ON "chat_run_backups"("user_id", "conversation_id", "updated_at");

-- AddForeignKey
ALTER TABLE "chat_run_backups" ADD CONSTRAINT "chat_run_backups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_run_backups" ADD CONSTRAINT "chat_run_backups_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
