import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

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
	await app.listen(3000);
}
bootstrap();
