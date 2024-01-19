import io from 'socket.io-client';

export const socket = io('ws://localhost:8080', {
	autoConnect: false,
	withCredentials: true,
});

export const gameSocket = io('ws://localhost:8090', {
	withCredentials: true,
});
