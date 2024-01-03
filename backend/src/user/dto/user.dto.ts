import { IsNotEmpty, Length, MinLength } from 'class-validator';

export class CompleteProfileDto {
	@IsNotEmpty({ message: 'Password is required.' })
	@MinLength(1, {
		message: 'Password must be at least 1 characters long.',
	})
	password: string;
}

export class EditNicknameDto {
	@Length(1, 100)
	nickname: string;
}
