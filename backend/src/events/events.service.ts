// events.service.ts
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class EventsService {
	constructor(private userService: UserService) {}

	// Functions to handle user online/offline status
	async userConnected(email: string) {
		try {
			const userId = await this.userService.findUserIdByMail(email);
			if (userId) {
				console.log('User tracked online ', userId);
				await this.userService.setUserOnline(userId);
			} else {
				console.log('User not found for email: ', email);
			}
		} catch (error) {
			console.error(error.message);
		}
	}

	async userDisconnected(email: string) {
		const userId = await this.userService.findUserIdByMail(email);

		if (userId) {
			console.log('User tracked offline ', userId);
			await this.userService.setUserOffline(userId);
		} else {
			console.log('User not found: ', email);
		}
	}
}
