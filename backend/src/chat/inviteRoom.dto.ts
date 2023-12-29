import { IsUUID, IsNotEmpty, IsString } from 'class-validator';

export class InviteRoomDto {
	@IsUUID()
	roomId: string;

	@IsNotEmpty()
	@IsString()
	userNameToInvite: string;
}
