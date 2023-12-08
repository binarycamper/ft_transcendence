import { IsString } from 'class-validator';

export class SendMessageDto {
	@IsString()
	receiverId: string; // The ID of the user who will receive the message

	@IsString()
	messageContent: string; // The content of the message being sent
}
