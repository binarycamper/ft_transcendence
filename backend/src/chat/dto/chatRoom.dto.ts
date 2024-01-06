// chat-room.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsNumber } from 'class-validator';
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

export class ChangePasswordDto {
	@IsNotEmpty()
	@IsString()
	roomId: string;

	@IsString()
	oldPassword: string;

	@IsString()
	@IsOptional()
	newPassword?: string;
}
export class RoomIdUserIdDTO {
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	roomId: string;

	@IsString()
	@IsNotEmpty()
	@IsUUID()
	userId: string;
}

export class InviteRoomDto {
	@IsUUID()
	roomId: string;

	@IsNotEmpty()
	@IsString()
	userNameToInvite: string;

	@IsOptional()
	@IsString()
	password: string;
}

export class FriendRequestDto {
	@IsString()
	@IsNotEmpty()
	readonly recipient: string;

	@IsString()
	@IsNotEmpty()
	readonly messageType: 'friend_request' | 'system_message';

	@IsString()
	@IsNotEmpty()
	readonly content: string;
}

export class ClearChatRoomDto {
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	chatroomId: string;
}

export class MuteUserDto {
	@IsNotEmpty()
	@IsNumber()
	muteDuration: number; // Duration in milliseconds

	@IsNotEmpty()
	@IsString()
	roomId: string;

	@IsNotEmpty()
	@IsString()
	userIdToMute: string;
}
