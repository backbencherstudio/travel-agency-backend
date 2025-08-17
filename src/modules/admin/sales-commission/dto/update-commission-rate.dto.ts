import { PartialType } from '@nestjs/swagger';
import { CreateCommissionRateDto } from './create-commission-rate.dto';

export class UpdateCommissionRateDto extends PartialType(CreateCommissionRateDto) { } 