import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/user.dto';
import { CompleteProfileDto } from './dto/completeProfile.dto';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async completeProfile(userId: string, completeProfileDto: CompleteProfileDto) {
		const user = await this.userRepository.findOne({ where: { id: userId }});
		if (user) {
		user.username = completeProfileDto.username;
		user.avatar = completeProfileDto.avatar;
		await this.userRepository.save(user);
		}
	}

	async isProfileComplete(userId: string): Promise<boolean> {
		const user = await this.userRepository.findOne({ where: { id: userId }});
		return !!(user && user.username && user.avatar);
	}

	async findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	async findOne(id: string): Promise<User> {
		return this.userRepository.findOne({where:{id: id}});
	}

	async create(createUserDto: CreateUserDto): Promise<User> {
		const user = this.userRepository.create(createUserDto);
		return this.userRepository.save(user);
  	}

	async update(id: string, user: User): Promise<void> {
		await this.userRepository.update(id, user);
	}

	async remove(id: string): Promise<void> {
		await this.userRepository.delete(id);
	}
}
