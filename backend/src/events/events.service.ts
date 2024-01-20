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
			if (user && user.id) {
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
				console.log('in userConnected:', error.message);
			} else {
				console.log('An unknown error occurred in userConnected');
			}
		}
	}

	async userDisconnected(email: string) {
		try {
			const user: User = await this.userService.findUserIdByMail(email);

			if (user && user.id) {
				// Check if user is not null before accessing 'id'
				if (this.userConnectionMap.has(user.id)) {
					clearTimeout(this.userConnectionMap.get(user.id));
				}

				const timeout = setTimeout(async () => {
					await this.userService.setUserOffline(user.id);
					console.log('User tracked offline: ', user.id);
					this.userConnectionMap.delete(user.id);
				}, 10000); // Set a delay of 10 seconds (10000 milliseconds)

				this.userConnectionMap.set(user.id, timeout);
			} else {
				console.log('User not found or has no ID: ', email);
			}
		} catch (error) {
			console.log('Error occurred: ', error);
		}
	}
}
