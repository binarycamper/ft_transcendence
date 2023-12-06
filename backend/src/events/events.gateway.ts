// events.gateway.ts
import {
	WebSocketGateway,
	SubscribeMessage,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { EventsService } from './events.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: '/events', cors: true })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;

	constructor(private eventsService: EventsService, private jwtService: JwtService) {}

	async handleConnection(client: any) {
		// Extract user ID from the client, e.g., from the token
		const userId = this.extractUserIdFromSocket(client);
		await this.eventsService.userConnected(userId);
	}

	async handleDisconnect(client: any) {
		const userId = this.extractUserIdFromSocket(client);
		await this.eventsService.userDisconnected(userId);
	}

	// Utility function to extract the user ID from the socket connection
	private extractUserIdFromSocket(client: Socket): string | null {
		try {
			const authToken = client.handshake?.query?.auth_token;
			//console.log('Auth Token: ', client.handshake.query.auth_token);
			//console.log('Test: ', JSON.stringify(client.handshake.query, null, 2));

			if (!authToken) {
				console.log('No auth token provided, proceeding without authentication.');
				return null;
			}

			// Verify the token
			const decoded = this.jwtService.verify(authToken as string);

			// Return the user ID from the token's payload
			return decoded.sub;
		} catch (error) {
			console.error('Error extracting user from socket', error);
			return null; // Or handle the error as appropriate for your application
		}
	}

	@SubscribeMessage('events')
	handleEvent(client: any, data: string): string {
		return data;
	}
}
