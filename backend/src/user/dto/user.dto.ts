import {
	IsNotEmpty,
	IsString,
	Matches,
	IsStrongPassword,
	Length,
	MinLength,
} from 'class-validator';

export class CompleteProfileDto {
	//TODO: increase pw len & decomment IsStrong
	//@IsStrongPassword()
	@IsNotEmpty({ message: 'Password is required.' })
	// @Length(8, 20, { message: 'Password must be between 8 and 20 characters long.' })
	// @Matches(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W]).{8,20})/, {
	// 	message: 'Password must include uppercase, lowercase, number, and special character.',
	// })
	@MinLength(1, {
		message: 'Password must be at least 1 characters long.',
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
