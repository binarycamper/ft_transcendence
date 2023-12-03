import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class Verify2FADto {
	readonly userId: string; // Oder string, je nachdem wie Ihre Benutzer-IDs strukturiert sind

	@IsString()
	@IsNotEmpty()
	readonly token: string; // Der 2FA-Code, den der Benutzer eingibt
}
