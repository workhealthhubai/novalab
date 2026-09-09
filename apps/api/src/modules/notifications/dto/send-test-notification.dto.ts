import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendTestNotificationDto {
  @ApiProperty({ enum: ['email', 'sms', 'in-app'] })
  @IsIn(['email', 'sms', 'in-app'])
  channel!: 'email' | 'sms' | 'in-app';

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MaxLength(254)
  recipient!: string;

  @ApiProperty({ example: 'appointment-reminder' })
  @IsString()
  @MaxLength(100)
  template!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
