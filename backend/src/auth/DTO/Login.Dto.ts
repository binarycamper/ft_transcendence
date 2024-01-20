import { IsAscii, IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
	@IsNotEmpty({ message: 'Email is required.' })
	@IsEmail({}, { message: 'Invalid email format.' })
	email: string;

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
