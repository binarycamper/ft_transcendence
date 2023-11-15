// src/auth/auth.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class AuthCallbackDto {
	@IsString()
    @IsNotEmpty()
	code: string;
  }
  