import { IsNotEmpty, IsString } from 'class-validator';
import { Socket } from 'socket.io';

export interface DecodedToken {
	email: string;
	id: string;
	name: string;
	iat: number;
	exp: number;
}

export interface SocketWithUserData extends Socket {
	data: {
		user: DecodedToken;
	};
}

export interface AuthenticatedSocket extends Socket {
	data: {
		user: DecodedToken;
	};
}

export class SendMessageDto {
	@IsNotEmpty()
	@IsString()
	receiverId: string;

	@IsNotEmpty()
	@IsString()
	content: string;
}

export class SendMessageToChatRoomDto {
	@IsNotEmpty()
	@IsString()
	chatRoomId: string;

	@IsNotEmpty()
	@IsString()
	content: string;
}
