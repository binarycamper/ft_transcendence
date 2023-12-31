// chat-room.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateChatRoomDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	ownerId: string;

	@IsString()
	@IsNotEmpty()
	ownerName: string;

	@IsString()
	@IsNotEmpty()
	type: string;

	@IsString()
	@IsOptional()
	password?: string;

	@IsArray()
	@IsString({ each: true })
	adminIds: string[];

	@IsArray()
	@IsOptional()
	messages: any[]; // Define the type based on your message structure

	@IsArray()
	@IsOptional()
	users: any[]; // Define the type based on your user structure
}
