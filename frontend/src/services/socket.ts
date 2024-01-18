// socket.ts
import io from 'socket.io-client';

// Create the socket connection
const socket = io('http://localhost:8080/', {
	withCredentials: true,
});

export { socket };
