import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty()
  rating_value?: number;

  @ApiProperty()
  comment?: string;
}
