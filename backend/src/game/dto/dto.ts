import { IsNotEmpty } from 'class-validator';
// import { Request } from 'express';
// import { User } from '../../user/user.entity'; // Ersetzen Sie dies durch den tatsächlichen Importpfad

// export interface RequestWithUser extends Request {
// 	user: User;
// }

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
