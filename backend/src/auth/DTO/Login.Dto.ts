import { IsNotEmpty } from 'class-validator';

//TODO: BEtter validators for email and pw !!
export class LoginDto {
	@IsNotEmpty({ message: 'Email is required.' })
	email: string;

	@IsNotEmpty({ message: 'Password is required.' })
	password: string;
}
