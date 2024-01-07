import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { User } from 'src/user/user.entity';
import { Match } from 'src/matchmaking/matchmaking.entity';
// Import other necessary modules and services

@Module({
	imports: [
		TypeOrmModule.forFeature([Game, User, Match]), // Add other entities if needed, e.g., User
		// Other modules required by GameModule, e.g., UserModule if you need user-related operations
	],
	controllers: [GameController], // Your game controller
	providers: [GameService], // Your game service
	exports: [GameService], // Export GameService if it will be used outside of this module
})
export class GameModule {}
