import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class Verify2FADto {
	@IsString()
	@IsNotEmpty()
	readonly token: string; // Der 2FA-Code, den der Benutzer eingibt

	@IsString()
	@IsNotEmpty()
	readonly userId: string; // Die Benutzer-ID
}
