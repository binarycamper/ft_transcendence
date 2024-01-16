import { IsNotEmpty } from 'class-validator';

export class NewPasswordDto {
	@IsNotEmpty({ message: 'new pw is required.' })
	// @IsEmail({}, { message: 'Invalid email format.' })
	newPassword: string;

	@IsNotEmpty({ message: 'confirm pw is required.' })
	confirmPassword: string;

	@IsNotEmpty({ message: 'token is required.' })
	token: string;
}

export class SendResetPasswordEmailDto {
	@IsNotEmpty({ message: 'email is required.' })
	email: string;
}
