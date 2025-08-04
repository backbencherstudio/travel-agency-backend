import { PartialType } from '@nestjs/swagger';
import { CreateJumioVerificationDto } from './create-jumio-verification.dto';

export class UpdateJumioVerificationDto extends PartialType(CreateJumioVerificationDto) { } 