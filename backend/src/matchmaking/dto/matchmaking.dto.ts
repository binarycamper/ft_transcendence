import { IsString } from 'class-validator';

export class RejoinQueueDto {
	@IsString()
	status: string;
}
