import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  task_id: string;
}
