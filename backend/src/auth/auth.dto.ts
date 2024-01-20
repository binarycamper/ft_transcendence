import { IsAlphanumeric, IsNotEmpty, IsString, Length } from 'class-validator';

export class AuthCallbackDto {
	@IsNotEmpty({ message: 'Code is required.' })
	@IsString({ message: 'Code must be a string.' })
	@Length(287, 287, { message: 'Code must be between 10 and 100 characters.' })
	@IsAlphanumeric()
	code: string;
}
