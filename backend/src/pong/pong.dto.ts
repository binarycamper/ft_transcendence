import { IsBoolean, IsIn, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AspectRatio {
	@IsNumber()
	@IsIn([4])
	x: number;

	@IsNumber()
	@IsIn([3])
	y: number;
}

export class PongGameSettingsDto {
	@ValidateNested()
	@Type(() => AspectRatio)
	aspectRatio: AspectRatio;

	@IsNumber()
	@Min(2)
	@Max(2)
	ballAccel: number;

	@IsNumber()
	@Min(50)
	@Max(80)
	ballSpeed: number;

	@IsNumber()
	@Min(1.5)
	@Max(12)
	ballWidth: number;

	@IsBoolean()
	computer: boolean;

	@IsNumber()
	@Min(1)
	@Max(8)
	paddleGap: number;

	@IsNumber()
	@Min(12)
	@Max(25)
	paddleHeight: number;

	@IsNumber()
	@Min(50)
	@Max(80)
	paddleSpeed: number;

	@IsNumber()
	@Min(1)
	@Max(3)
	paddleWidth: number;

	@IsString()
	@IsIn(['left', 'right'])
	side: string;

	@IsNumber()
	@Min(2)
	@Max(2)
	wallHeight: number;
}
