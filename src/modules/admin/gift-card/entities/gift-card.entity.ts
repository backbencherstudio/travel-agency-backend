export class GiftCard {
    id: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
    status?: number;

    // Gift card code (unique identifier for redemption)
    code?: string;

    // Gift card amount and balance
    amount?: number; // Original gift card value
    currency?: string;

    // Purchaser information
    purchaser_id?: string;

    // Recipient information
    recipient_id?: string;

    // Gift card details
    title?: string; // e.g. "Birthday Gift Card"
    message?: string; // Personal message from purchaser
    design_type?: string; // Gift card design theme

    // Validity period
    issued_at?: Date;
    expires_at?: Date; // Expiration date (null for no expiry)
    redeemed_at?: Date; // When fully redeemed
}