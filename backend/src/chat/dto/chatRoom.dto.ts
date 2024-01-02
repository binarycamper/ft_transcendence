// chat-room.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { Mute } from '../mute.entity';
import { User } from 'src/user/user.entity';
import { ChatMessage } from '../chat.entity';

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
	mutes: Mute[];

	@IsArray()
	@IsOptional()
	messages: ChatMessage[]; // Define the type based on your message structure

	@IsArray()
	@IsOptional()
	users: User[]; // Define the type based on your user structure
}
