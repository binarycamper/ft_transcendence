import { IsString } from 'class-validator';

export class ChatHistoryQueryDto {
	@IsString()
	userId: string; // The ID of the user who is requesting the chat history

	@IsString()
	otherUserId: string; // The ID of the other user involved in the conversation
}
