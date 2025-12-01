import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreatePackageDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Package type. e.g. tour, package, cruise',
        example: 'tour',
        enum: ['tour', 'package', 'cruise'],
        required: false,
    })
    type?: string;

    @ValidateIf((o) => o.type === 'package')
    @IsNotEmpty()
    @IsString()
    @IsIn(['national', 'international'])
    @IsOptional()
    @ApiProperty({
        description:
            'Package region type. Required when type is \"package\". Not used for tours.',
        example: 'national',
        enum: ['national', 'international'],
        required: false,
    })
    region_type?: string;
}
