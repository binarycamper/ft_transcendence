import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class InviteRoomDto {
	@IsUUID()
	roomId: string;

	@IsNotEmpty()
	@IsString()
	userNameToInvite: string;

	@IsOptional()
	password: string;
}
