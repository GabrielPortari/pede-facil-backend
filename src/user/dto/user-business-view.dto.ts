import { ApiProperty } from '@nestjs/swagger';

export class UserBusinessViewDto {
  @ApiProperty({ example: 'user-uid-123' })
  id: string;

  @ApiProperty({ example: 'Joao Silva' })
  name: string;

  @ApiProperty({ example: '2026-03-10T15:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-03-12T10:30:00.000Z' })
  updatedAt?: Date;
}
