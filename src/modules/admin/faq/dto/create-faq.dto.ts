import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateFaqDto {
  @IsNotEmpty()
  @ApiProperty()
  question: string;

  @IsNotEmpty()
  @ApiProperty()
  answer: string;

  @ApiProperty()
  sort_order: number;
}
