// src/chat/dto/create.chat.dto.ts
export class CreateChatDto {
	readonly senderId: string;
	readonly receiverId: string;
	readonly messageType: 'friend_request' | 'system_message';
	readonly content: string;
}
