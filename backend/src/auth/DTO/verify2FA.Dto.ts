import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2FADto {
	// If problems delete this
	@IsString({ message: 'Token must be a string.' })
	@IsNotEmpty({ message: 'Token is required.' })
	@Length(6, 6, { message: 'Token must be exactly 6 characters long.' })
	readonly token: string;
}

export class Toggle2FADto {
	@IsBoolean({ message: 'enable2FA must be a boolean value.' })
	readonly enable2FA: boolean;
}

export class VerifyResetTokenDto {
	@IsNotEmpty()
	@IsString()
	token: string;
}

export class FADto {
	@IsBoolean()
	has2FA: boolean;
}
