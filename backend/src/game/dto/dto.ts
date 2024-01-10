import { IsNotEmpty } from 'class-validator';

export class GameUpdateDto {
	@IsNotEmpty({ message: 'Id is required.' })
	id: string;

	@IsNotEmpty({ message: 'ScorePlayerOne is required.' })
	scorePlayerOne: number;

	@IsNotEmpty({ message: 'ScorePlayerTwo is required.' })
	scorePlayerTwo: number;

	@IsNotEmpty({ message: 'WinnerId is required.' })
	winnerId: string;

	@IsNotEmpty({ message: 'EndTime is required.' })
	endTime: Date;
}
