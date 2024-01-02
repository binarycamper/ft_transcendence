// kickUser.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

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
