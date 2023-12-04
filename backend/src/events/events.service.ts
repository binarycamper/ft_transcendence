// events.service.ts
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class EventsService {
	constructor(private userService: UserService) {}

	// Functions to handle user online/offline status
	userConnected(userId: string) {
		console.log('User tracked online ', userId);
		this.userService.setUserOnline(userId);
	}

	userDisconnected(userId: string) {
		console.log('User tracked offline ', userId);
		this.userService.setUserOffline(userId);
	}
}
