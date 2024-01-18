import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
	const logger = new Logger(bootstrap.name);
	const app = await NestFactory.create(AppModule);

	app.use((req: Request, res: Response, next: NextFunction) => {
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

	// Apply rate limiting
	app.use(
		rateLimit({
			windowMs: 5 * 60 * 1000, // 5min
			max: 200, // requests
			skip: function (req) {
				return req.path.startsWith('/game');
			},
		}),
	);

	await app.listen(8080).catch((error) => {
		console.log('error: ', error);
		logger.error('Error starting the server', error);
	});
}
void bootstrap();
