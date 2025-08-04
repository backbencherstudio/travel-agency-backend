import { ApiProperty } from '@nestjs/swagger';

export class JumioVerificationResponseDto {
    @ApiProperty({
        description: 'Jumio verification ID',
        example: 'clx1234567890abcdef'
    })
    id: string;

    @ApiProperty({
        description: 'User ID for the verification',
        example: 'clx1234567890abcdef'
    })
    user_id: string;

    @ApiProperty({
        description: 'Type of verification',
        example: 'id_verification'
    })
    verification_type: string;

    @ApiProperty({
        description: 'Verification status',
        example: 'pending'
    })
    jumio_status: string;

    @ApiProperty({
        description: 'QR code URL for mobile verification',
        example: 'https://api.jumio.com/qr/123456'
    })
    qr_code_url: string;

    @ApiProperty({
        description: 'QR code data for web verification',
        example: '{"qr_data": "base64_encoded_data"}'
    })
    qr_code_data: string;

    @ApiProperty({
        description: 'Session expiration date',
        example: '2024-12-31T23:59:59.000Z'
    })
    session_expires_at: Date;

    @ApiProperty({
        description: 'Whether verification is completed',
        example: false
    })
    is_completed: boolean;

    @ApiProperty({
        description: 'Completion timestamp',
        example: '2024-01-15T10:30:00.000Z'
    })
    completed_at: Date;

    @ApiProperty({
        description: 'Verification score (0-100)',
        example: 95
    })
    verification_score: number;

    @ApiProperty({
        description: 'Admin notes',
        example: 'Verification completed successfully'
    })
    admin_notes: string;

    @ApiProperty({
        description: 'Whether verification was manually reviewed',
        example: false
    })
    manually_reviewed: boolean;

    @ApiProperty({
        description: 'Manual review timestamp',
        example: '2024-01-15T10:30:00.000Z'
    })
    reviewed_at: Date;

    @ApiProperty({
        description: 'User who reviewed the verification (admin)',
        example: 'admin_user_id'
    })
    reviewed_by: string;



    @ApiProperty({
        description: 'Error message if verification failed',
        example: 'Document image quality too low'
    })
    error_message: string;

    @ApiProperty({
        description: 'Verification creation date',
        example: '2024-01-01T00:00:00.000Z'
    })
    created_at: Date;

    @ApiProperty({
        description: 'Verification last update date',
        example: '2024-01-15T10:30:00.000Z'
    })
    updated_at: Date;

    @ApiProperty({
        description: 'User information',
        example: {
            id: 'clx1234567890abcdef',
            name: 'John Doe',
            email: 'john@example.com'
        }
    })
    user: {
        id: string;
        name: string;
        email: string;
    };

    @ApiProperty({
        description: 'Related legal documents',
        type: 'array',
        example: [
            {
                id: 'doc123',
                title: 'Passport',
                document_type: 'passport'
            }
        ]
    })
    legal_documents: Array<{
        id: string;
        title: string;
        document_type: string;
    }>;
}

export class JumioVerificationListResponseDto {
    @ApiProperty({
        description: 'List of Jumio verifications',
        type: [JumioVerificationResponseDto]
    })
    data: JumioVerificationResponseDto[];

    @ApiProperty({
        description: 'Total number of verifications',
        example: 100
    })
    total: number;

    @ApiProperty({
        description: 'Current page number',
        example: 1
    })
    page: number;

    @ApiProperty({
        description: 'Number of items per page',
        example: 10
    })
    limit: number;

    @ApiProperty({
        description: 'Total number of pages',
        example: 10
    })
    totalPages: number;

    @ApiProperty({
        description: 'Whether there is a next page',
        example: true
    })
    hasNextPage: boolean;

    @ApiProperty({
        description: 'Whether there is a previous page',
        example: false
    })
    hasPreviousPage: boolean;
} 