import { IsAscii, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class NewPasswordDto {
	@IsNotEmpty({ message: 'New Password is required.' })
	@IsAscii()
	@MinLength(1, {
		message: 'New Password must be at least 1 characters long.',
	})
	@MaxLength(64, {
		message: 'New Password must be at most 64 characters long.',
	})
	newPassword: string;

	@IsNotEmpty({ message: 'confirm pw is required.' })
	@IsAscii()
	@MinLength(1, {
		message: 'New Password must be at least 1 characters long.',
	})
	@MaxLength(64, {
		message: 'New Password must be at most 64 characters long.',
	})
	confirmPassword: string;

	@IsNotEmpty({ message: 'token is required.' })
	token: string;
}

export class SendResetPasswordEmailDto {
	@IsNotEmpty({ message: 'email is required.' })
	email: string;
}
