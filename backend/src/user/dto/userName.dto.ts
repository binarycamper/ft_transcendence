import { Length } from 'class-validator';

export class EditNicknameDto {
	@Length(1, 100)
	nickname: string;
}
