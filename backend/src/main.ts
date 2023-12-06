import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import * as http from 'http';

async function bootstrap() {
	const logger = new Logger('Bootstrap');
	const app = await NestFactory.create(AppModule);

	app.use((req, res, next) => {
		logger.log(`Incoming request for: ${req.method} ${req.url}`);
		next();
	});
	// Set up cookie parser middleware
	app.use(cookieParser());

	// Set up CORS configuration
	app.enableCors({
		origin: 'http://localhost:5173',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,FETCH',
		credentials: true,
	});

	// Set up global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			exceptionFactory: (errors) => {
				console.log(errors);
				return new BadRequestException(errors);
			},
		}),
	);
	const httpServer = http.createServer(app.getHttpServer());
	const io = new Server(httpServer, {
		cors: {
			origin: 'http://localhost:5173',
		},
	});

	// A map to keep track of online users
	const onlineUsers = new Map();

	io.on('connection', (socket) => {
		const authToken = socket.handshake.query.authToken;
		onlineUsers.set(authToken, socket.id);
		console.log(`User (token: ${authToken}) connected with socket id ${socket.id}`);

		socket.on('disconnect', () => {
			onlineUsers.delete(authToken);
			console.log(`User ${authToken} disconnected`);
		});
	});

	// Apply rate limiting
	app.use(
		rateLimit({
			windowMs: 10 * 60 * 1000, // 10 minutes
			max: 100, // limit each IP to 100 requests per windowMs && Todo: maybe exclude the game requests?
		}),
	);

	await app.listen(3000);
}
bootstrap();
