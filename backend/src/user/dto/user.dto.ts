import { IsAscii, IsNotEmpty, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CompleteProfileDto {
	@IsNotEmpty({ message: 'Password is required.' })
	@IsAscii()
	@MinLength(1, {
		message: 'Password must be at least 1 characters long.',
	})
	@MaxLength(64, {
		message: 'Password must be at most 64 characters long.',
	})
	password: string;
}

export class EditNicknameDto {
	@IsString()
	@IsNotEmpty()
	@Length(1, 24)
	nickname: string;
}

export class GetUserNameDto {
	@IsString()
	@IsNotEmpty()
	readonly senderid: string;
}

export class GetImageDto {
	@IsString()
	@IsNotEmpty()
	readonly filename: string;
}

export class RemoveFriendDto {
	@IsString()
	@IsNotEmpty()
	readonly friendid: string;
}

export class AddFriendDto {
	@IsString()
	@IsNotEmpty()
	readonly friendName: string;
}

export class BlockUserDto {
	@IsString()
	@IsNotEmpty()
	readonly userName: string;
}

export class UnblockUserDto {
	@IsString()
	@IsNotEmpty()
	readonly userid: string;
}

export class GetPublicProfileDto {
	@IsString()
	@IsNotEmpty()
	readonly friendname: string;
}
