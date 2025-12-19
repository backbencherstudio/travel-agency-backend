/*
  Warnings:

  - You are about to drop the column `max_capacity` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the column `min_capacity` on the `packages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "booking_items" ADD COLUMN     "adults_count" INTEGER DEFAULT 0,
ADD COLUMN     "availability_id" TEXT,
ADD COLUMN     "children_count" INTEGER DEFAULT 0,
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "excluded_packages" TEXT,
ADD COLUMN     "extra_services" TEXT,
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "included_packages" TEXT,
ADD COLUMN     "infants_count" INTEGER DEFAULT 0,
ADD COLUMN     "price_per_person" DECIMAL(65,30),
ADD COLUMN     "selected_date" DATE,
ADD COLUMN     "total_price" DECIMAL(65,30),
ADD COLUMN     "total_travelers" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "booking_travellers" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "price_per_person" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "adults_count" INTEGER DEFAULT 0,
ADD COLUMN     "booking_type" TEXT DEFAULT 'book',
ADD COLUMN     "children_count" INTEGER DEFAULT 0,
ADD COLUMN     "client_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "escrow_status" TEXT DEFAULT 'pending',
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "infants_count" INTEGER DEFAULT 0,
ADD COLUMN     "payout_schedule" TEXT DEFAULT 'event_based',
ADD COLUMN     "place_id" TEXT,
ADD COLUMN     "release_percentage_30days" DECIMAL(65,30),
ADD COLUMN     "release_percentage_final" DECIMAL(65,30),
ADD COLUMN     "total_travelers" INTEGER DEFAULT 0,
ALTER COLUMN "payment_status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "checkout_items" ADD COLUMN     "adults_count" INTEGER DEFAULT 0,
ADD COLUMN     "availability_id" TEXT,
ADD COLUMN     "children_count" INTEGER DEFAULT 0,
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "infants_count" INTEGER DEFAULT 0,
ADD COLUMN     "price_per_person" DECIMAL(65,30),
ADD COLUMN     "selected_date" DATE,
ADD COLUMN     "total_price" DECIMAL(65,30),
ADD COLUMN     "total_travelers" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "checkout_travellers" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "price_per_person" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN     "place_id" TEXT;

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DECIMAL(65,30),
ADD COLUMN     "longitude" DECIMAL(65,30),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip_code" TEXT;

-- AlterTable
ALTER TABLE "package_trip_plans" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "duration_type" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "max_capacity",
DROP COLUMN "min_capacity",
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "discount_percent" INTEGER,
ADD COLUMN     "final_price" DECIMAL(65,30),
ADD COLUMN     "max_adults" INTEGER DEFAULT 10,
ADD COLUMN     "max_children" INTEGER DEFAULT 9,
ADD COLUMN     "max_infants" INTEGER DEFAULT 2,
ADD COLUMN     "min_adults" INTEGER DEFAULT 1,
ADD COLUMN     "min_children" INTEGER DEFAULT 0,
ADD COLUMN     "min_infants" INTEGER DEFAULT 0,
ADD COLUMN     "partial_payment_schedule" TEXT,
ADD COLUMN     "price_type" TEXT DEFAULT 'general',
ADD COLUMN     "rejected_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "gift_card_purchase_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_connect_account_id" TEXT,
ADD COLUMN     "vendor_request_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "website_infos" ADD COLUMN     "privacy_policy" TEXT;

-- CreateTable
CREATE TABLE "commission_calculations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "recipient_user_id" TEXT,
    "base_amount" DECIMAL(65,30),
    "commission_rate_value" DECIMAL(65,30),
    "commission_amount" DECIMAL(65,30),
    "commission_type" TEXT,
    "commission_status" TEXT DEFAULT 'pending',
    "commission_period_start" TIMESTAMP(3),
    "commission_period_end" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "disputed_at" TIMESTAMP(3),
    "dispute_reason" TEXT,
    "admin_notes" TEXT,
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(65,30),
    "payment_method" TEXT,

    CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_availabilities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "package_id" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_available" BOOLEAN DEFAULT true,
    "available_slots" INTEGER DEFAULT 1,

    CONSTRAINT "package_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_opening_hours" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "package_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_open" BOOLEAN DEFAULT true,
    "break_start_time" TEXT,
    "break_end_time" TEXT,

    CONSTRAINT "package_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "name" TEXT,
    "address" TEXT,
    "description" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "type" TEXT,
    "city" TEXT,
    "country" TEXT,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_places" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "package_id" TEXT NOT NULL,
    "place_id" TEXT,
    "type" TEXT DEFAULT 'meeting_point',
    "meet_time" TEXT,

    CONSTRAINT "package_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_additional_info" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "package_id" TEXT NOT NULL,
    "type" TEXT,
    "title" TEXT,
    "description" TEXT,
    "is_important" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "package_additional_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_trip_plan_details" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "title" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "time" INTEGER,
    "package_trip_plan_id" TEXT,

    CONSTRAINT "package_trip_plan_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_trip_plan_destinations" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_trip_plan_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,

    CONSTRAINT "package_trip_plan_destinations_pkey" PRIMARY KEY ("package_trip_plan_id","destination_id")
);

-- CreateTable
CREATE TABLE "checkout_availabilities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "checkout_id" TEXT,
    "package_id" TEXT,
    "selected_date" DATE,
    "requested_adults" INTEGER DEFAULT 0,
    "requested_children" INTEGER DEFAULT 0,
    "requested_infants" INTEGER DEFAULT 0,
    "requested_total" INTEGER DEFAULT 0,
    "is_available" BOOLEAN DEFAULT true,
    "available_slots" INTEGER DEFAULT 0,
    "remaining_slots" INTEGER DEFAULT 0,
    "price_per_person" DECIMAL(65,30),
    "total_price" DECIMAL(65,30),
    "validation_message" TEXT,

    CONSTRAINT "checkout_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_availabilities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "package_id" TEXT,
    "selected_date" DATE,
    "requested_adults" INTEGER DEFAULT 0,
    "requested_children" INTEGER DEFAULT 0,
    "requested_infants" INTEGER DEFAULT 0,
    "requested_total" INTEGER DEFAULT 0,
    "is_available" BOOLEAN DEFAULT true,
    "available_slots" INTEGER DEFAULT 0,
    "remaining_slots" INTEGER DEFAULT 0,
    "price_per_person" DECIMAL(65,30),
    "total_price" DECIMAL(65,30),
    "validation_message" TEXT,

    CONSTRAINT "booking_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_files" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "review_id" TEXT,
    "file" TEXT,
    "file_alt" TEXT,
    "type" TEXT,

    CONSTRAINT "review_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wish_lists" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "package_id" TEXT,
    "note" TEXT,

    CONSTRAINT "wish_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "shareable_type" TEXT,
    "shareable_id" TEXT,
    "share_method" TEXT,
    "recipient_email" TEXT,
    "recipient_name" TEXT,
    "message" TEXT,
    "share_link" TEXT,
    "status" TEXT DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER DEFAULT 0,
    "click_count" INTEGER DEFAULT 0,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "user_id" TEXT,
    "document_type" TEXT,
    "title" TEXT,
    "description" TEXT,
    "verification_status" TEXT DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "verification_score" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "jumio_verification_id" TEXT,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_files" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "legal_document_id" TEXT,
    "file" TEXT,
    "file_alt" TEXT,
    "type" TEXT,

    CONSTRAINT "legal_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jumio_verifications" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "user_id" TEXT,
    "jumio_reference_id" TEXT,
    "jumio_scan_reference" TEXT,
    "verification_type" TEXT,
    "jumio_status" TEXT DEFAULT 'PENDING',
    "jumio_result" TEXT,
    "document_type" TEXT,
    "document_country" TEXT,
    "document_number" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "nationality" TEXT,
    "verification_score" INTEGER,
    "verification_confidence" TEXT,
    "jumio_created_at" TIMESTAMP(3),
    "jumio_updated_at" TIMESTAMP(3),
    "jumio_completed_at" TIMESTAMP(3),
    "session_expires_at" TIMESTAMP(3),
    "is_completed" BOOLEAN DEFAULT false,
    "admin_notes" TEXT,
    "manually_reviewed" BOOLEAN DEFAULT false,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "error_message" TEXT,
    "jumio_error_code" TEXT,

    CONSTRAINT "jumio_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_contexts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastIntent" TEXT,
    "userPreferences" TEXT,
    "bookingInProgress" BOOLEAN DEFAULT false,
    "currentStep" TEXT,

    CONSTRAINT "chatbot_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "message_type" TEXT DEFAULT 'text',
    "is_bot" BOOLEAN DEFAULT false,
    "metadata" TEXT,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "code" TEXT,
    "amount" DECIMAL(65,30),
    "currency" TEXT DEFAULT 'USD',
    "title" TEXT,
    "message" TEXT,
    "design_type" TEXT DEFAULT 'default',

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_purchases" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "quantity" INTEGER DEFAULT 1,
    "payment_status" TEXT DEFAULT 'pending',
    "payment_raw_status" TEXT,
    "paid_amount" DECIMAL(65,30),
    "paid_currency" TEXT,
    "payment_provider" TEXT,
    "payment_reference_number" TEXT,
    "gift_card_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "gift_card_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_gift_cards" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "gift_card_purchase_id" TEXT,
    "user_id" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "amount_used" DECIMAL(65,30) DEFAULT 0,
    "applied_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_gift_cards" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "checkout_id" TEXT,
    "gift_card_purchase_id" TEXT,
    "user_id" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "applied_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wish_lists_user_id_package_id_key" ON "wish_lists"("user_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "shares_share_link_key" ON "shares"("share_link");

-- CreateIndex
CREATE UNIQUE INDEX "jumio_verifications_jumio_reference_id_key" ON "jumio_verifications"("jumio_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_contexts_userId_conversationId_key" ON "chatbot_contexts"("userId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_availabilities" ADD CONSTRAINT "package_availabilities_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_opening_hours" ADD CONSTRAINT "package_opening_hours_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_places" ADD CONSTRAINT "package_places_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_places" ADD CONSTRAINT "package_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_additional_info" ADD CONSTRAINT "package_additional_info_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_trip_plan_details" ADD CONSTRAINT "package_trip_plan_details_package_trip_plan_id_fkey" FOREIGN KEY ("package_trip_plan_id") REFERENCES "package_trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_trip_plan_destinations" ADD CONSTRAINT "package_trip_plan_destinations_package_trip_plan_id_fkey" FOREIGN KEY ("package_trip_plan_id") REFERENCES "package_trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_trip_plan_destinations" ADD CONSTRAINT "package_trip_plan_destinations_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "package_places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_availabilities" ADD CONSTRAINT "checkout_availabilities_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_availabilities" ADD CONSTRAINT "checkout_availabilities_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "package_places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_availabilities" ADD CONSTRAINT "booking_availabilities_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_availabilities" ADD CONSTRAINT "booking_availabilities_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_gift_card_purchase_id_fkey" FOREIGN KEY ("gift_card_purchase_id") REFERENCES "gift_card_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_files" ADD CONSTRAINT "review_files_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_lists" ADD CONSTRAINT "wish_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_lists" ADD CONSTRAINT "wish_lists_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_jumio_verification_id_fkey" FOREIGN KEY ("jumio_verification_id") REFERENCES "jumio_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_files" ADD CONSTRAINT "legal_document_files_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jumio_verifications" ADD CONSTRAINT "jumio_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_purchases" ADD CONSTRAINT "gift_card_purchases_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_purchases" ADD CONSTRAINT "gift_card_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_gift_cards" ADD CONSTRAINT "booking_gift_cards_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_gift_cards" ADD CONSTRAINT "booking_gift_cards_gift_card_purchase_id_fkey" FOREIGN KEY ("gift_card_purchase_id") REFERENCES "gift_card_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_gift_cards" ADD CONSTRAINT "booking_gift_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_gift_cards" ADD CONSTRAINT "checkout_gift_cards_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_gift_cards" ADD CONSTRAINT "checkout_gift_cards_gift_card_purchase_id_fkey" FOREIGN KEY ("gift_card_purchase_id") REFERENCES "gift_card_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_gift_cards" ADD CONSTRAINT "checkout_gift_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
