import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.local' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Required only when the same e-mail exists in more than one tenant',
    example: 'demo',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{2,64}$/)
  tenantSlug?: string;
}
