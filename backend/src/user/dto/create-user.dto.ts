import {
	IsNotEmpty,
	IsString,
	IsOptional,
	IsEmail,
	Matches,
} from 'class-validator';

export class CreateUserDto {
	name: string;

	email: string;

	password: string;

	//@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
	//	message: 'Password too weak',})
}
