import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty()
	@IsString()
	username: string;

	@IsNotEmpty()
	@IsString()
	password: string;

	@IsEmail()
	@IsOptional()
	email?: string;

	@IsString()
	@IsOptional()
	avatar?: string;

	@IsString()
	@IsOptional()
	defaultAvatar?: string;
	// You don't need to include relations like messages, games, and matchHistory in DTOs.
	// ... other fields like two-factor authentication, status, etc.
  }

