import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGiftCardDto {
    @ApiProperty({ description: 'Gift card code (unique identifier)', example: 'GIFT2025' })
    @IsString()
    code: string;

    @ApiProperty({ description: 'Gift card amount', example: 100.00 })
    @Transform(({ value }) => Number(value))
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({ description: 'Currency', example: 'USD', default: 'USD' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({ description: 'Purchaser user ID' })
    @IsOptional()
    @IsString()
    purchaser_id?: string;

    @ApiPropertyOptional({ description: 'Recipient user ID' })
    @IsOptional()
    @IsString()
    recipient_id?: string;

    @ApiPropertyOptional({ description: 'Gift card title', example: 'Birthday Gift Card' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'Personal message from purchaser' })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional({ description: 'Gift card design theme', example: 'adventure' })
    @IsOptional()
    @IsString()
    design_type?: string;


    @ApiPropertyOptional({ description: 'Gift card issue date' })
    @IsOptional()
    @IsDateString()
    issued_at?: string;

    @ApiPropertyOptional({ description: 'Gift card expiration date' })
    @IsOptional()
    @IsDateString()
    expires_at?: string;
}