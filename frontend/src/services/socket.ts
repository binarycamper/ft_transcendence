import io from 'socket.io-client';

export const socket = io('ws://localhost:8080', {
	withCredentials: true,
});

export const gameSocket = io('ws://localhost:8090', {
	withCredentials: true,
});
