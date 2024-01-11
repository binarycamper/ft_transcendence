import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class EventsService {
	private userConnectionMap = new Map<string, NodeJS.Timeout>();

	constructor(private userService: UserService) {}

	async userConnected(email: string) {
		try {
			const userId = await this.userService.findUserIdByMail(email);
			if (userId) {
				const user = await this.userService.findProfileById(userId);
				if (user && user.status !== 'online' && user.status !== 'ingame') {
					console.log('User tracked online ', userId);
					await this.userService.setUserOnline(userId);
				}

				// Wenn der Benutzer wieder verbunden ist, löschen Sie das Timeout, falls vorhanden
				if (this.userConnectionMap.has(userId)) {
					clearTimeout(this.userConnectionMap.get(userId));
					this.userConnectionMap.delete(userId);
				}
			} else {
				console.log('User not found for email: ', email);
			}
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error in userConnected:', error.message);
			} else {
				console.log('An unknown error occurred in userConnected');
			}
		}
	}

	// async userDisconnected(email: string) {
	// 	try {
	// 		const userId = await this.userService.findUserIdByMail(email);

	// 		if (userId) {
	// 			const timeout = setTimeout(async () => {
	// 				console.log('User tracked offline: ', userId);
	// 				await this.userService.setUserOffline(userId);
	// 			}, 2_000);

	// 			this.userConnectionMap.set(userId, timeout);
	// 		} else {
	// 			console.log('User not found: ', email);
	// 		}
	// 	} catch (error) {
	// 		console.error('Error occurred: ', error);
	// 	}
	// }

	// test new
	async userDisconnected(email: string) {
		try {
			const userId = await this.userService.findUserIdByMail(email);

			if (userId) {
				const timeout = setTimeout(() => {
					this.userService
						.setUserOffline(userId)
						.then(() => {
							console.log('User tracked offline: ', userId);
						})
						.catch((error) => {
							console.error('Error setting user offline:', error);
						});
				}, 2_000);

				this.userConnectionMap.set(userId, timeout);
			} else {
				console.log('User not found: ', email);
			}
		} catch (error) {
			console.error('Error occurred: ', error);
		}
	}
}
