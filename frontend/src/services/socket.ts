import io from 'socket.io-client';
import { fetchWsUrl } from './fetchUrl';

export const socket = io(fetchWsUrl('8080'), {
	autoConnect: false,
	withCredentials: true,
});

export const gameSocket = io(fetchWsUrl('8080'), {
	withCredentials: true,
});
