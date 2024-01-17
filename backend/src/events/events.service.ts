import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from 'src/user/user.entity';

@Injectable()
export class EventsService {
	private userConnectionMap = new Map<string, NodeJS.Timeout>();

	constructor(private userService: UserService) {}

	async userConnected(email: string) {
		try {
			let user: User = await this.userService.findUserIdByMail(email);
			if (user.id) {
				user = await this.userService.findProfileById(user.id);
				if (user && user.status !== 'online' && user.status !== 'ingame') {
					console.log('User tracked online ', user.id);
					await this.userService.setUserOnline(user.id);
				}

				// Wenn der Benutzer wieder verbunden ist, löschen Sie das Timeout, falls vorhanden
				if (this.userConnectionMap.has(user.id)) {
					clearTimeout(this.userConnectionMap.get(user.id));
					this.userConnectionMap.delete(user.id);
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
			const user: User = await this.userService.findUserIdByMail(email);

			if (user.id) {
				const timeout = setTimeout(() => {
					this.userService
						.setUserOffline(user.id)
						.then(() => {
							console.log('User tracked offline: ', user.id);
						})
						.catch((error) => {
							console.error('Error setting user offline:', error);
						});
				}, 2_000);

				this.userConnectionMap.set(user.id, timeout);
			} else {
				console.log('User not found: ', email);
			}
		} catch (error) {
			console.error('Error occurred: ', error);
		}
	}
}
