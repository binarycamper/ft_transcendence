// socketContext.js

import { createContext } from 'react';
import io from 'socket.io-client';

// Create the socket connection
const socket = io('http://localhost:8080/', {
	withCredentials: true,
});
// Create the context
const SocketContext = createContext(socket);

export { SocketContext, socket };
