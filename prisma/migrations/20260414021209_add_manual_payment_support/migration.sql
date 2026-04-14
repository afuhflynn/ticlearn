-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL,
    "mtn_number" TEXT,
    "mtn_holder_name" TEXT,
    "orange_number" TEXT,
    "orange_holder_name" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_mtn_number_key" ON "payment_settings"("mtn_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_orange_number_key" ON "payment_settings"("orange_number");
