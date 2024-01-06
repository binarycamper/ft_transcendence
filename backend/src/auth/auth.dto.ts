import { IsNotEmpty } from 'class-validator';

export class AuthCallbackDto {
	@IsNotEmpty()
	code: string;
}
