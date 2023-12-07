import { IsNotEmpty, MinLength } from 'class-validator';

export class CompleteProfileDto {
	@IsNotEmpty({ message: 'Password is required.' })
	@MinLength(8, {
		message: 'Password must be at least 8 characters long.',
	})
	password: string;
}
