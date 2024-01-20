import {
	Controller,
	Get,
	Post,
	Body,
	Delete,
	Req,
	Res,
	UseGuards,
	Query,
	Logger,
	HttpException,
	HttpStatus,
	UploadedFile,
	UseInterceptors,
	BadRequestException,
	UsePipes,
	ValidationPipe,
	UnauthorizedException,
	NotFoundException,
	InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { StatusGuard } from 'src/auth/guards/status.guard';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as sharp from 'sharp';
import {
	AddFriendDto,
	BlockUserDto,
	CompleteProfileDto,
	EditNicknameDto,
	GetImageDto,
	GetPublicProfileDto,
	RemoveFriendDto,
	UnblockUserDto,
} from './dto/user.dto';
import { NotFoundError } from 'rxjs';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendRequest } from 'src/chat/friendRequest.entity';
import { Repository } from 'typeorm';

const UPLOAD_PATH = '/usr/src/app/uploads/';
let number = 0;

@Controller('user')
export class UserController {
	constructor(
		@InjectRepository(FriendRequest)
		private readonly friendrequestRepository: Repository<FriendRequest>,
		private readonly userService: UserService,
	) {}

	@Get('id')
	@UseGuards(JwtAuthGuard)
	getId(@Req() req: Request) {
		const { id, name } = req.user;
		return { id: id, name: name };
	}

	@Get('is-profile-complete')
	@UseGuards(JwtAuthGuard)
	async isProfileComplete(@Req() req: Request): Promise<{ isComplete: boolean }> {
		const isComplete = await this.userService.isProfilecreated(req.user?.id);
		return { isComplete };
	}

	@Post('complete')
	@UseGuards(JwtAuthGuard)
	@UsePipes(new ValidationPipe())
	async completeProfile(
		@Body() completeProfileDto: CompleteProfileDto,
		@Req() req: Request,
		@Res() res: Response,
	) {
		if (!req.user?.id) {
			throw new UnauthorizedException({
				status: HttpStatus.UNAUTHORIZED,
				error:
					'Access Denied: You are not authorized to access this resource or your profile is not in a state that requires completion.',
			});
		}
		const isProfileComplete: boolean = await this.userService.isProfilecreated(req.user?.id);
		if (isProfileComplete) {
			throw new HttpException('Profile already complete!', HttpStatus.SEE_OTHER);
		}

		if (!completeProfileDto.password) {
			throw new BadRequestException('Invalid password');
		}
		const options = {
			translations: zxcvbnEnPackage.translations,
			graphs: zxcvbnCommonPackage.adjacencyGraphs,
			dictionary: {
				...zxcvbnCommonPackage.dictionary,
				...zxcvbnEnPackage.dictionary,
			},
		};
		zxcvbnOptions.setOptions(options);
		const result = zxcvbn(completeProfileDto.password);
		if (result.feedback.warning) {
			throw new BadRequestException('Insecure Password');
		}
		await this.userService.complete(req.user?.id, completeProfileDto.password);
		return res
			.status(HttpStatus.OK)
			.json({ message: 'Profile updated successfully', userId: req.user?.id });
	}

	//Get the profile, must be complete user, render own profile, or redirect to signup if client has no account
	@Get('profile')
	@UseGuards(JwtAuthGuard, StatusGuard)
	async getProfile(@Req() req: Request) {
		const userProfileData: User = await this.userService.findProfileById(req.user.id);
		// Exclude password and other sensitive fields from the result
		//console.log('user profile data: ', userProfile.status);
		const { password, id, ...result } = userProfileData;

		return result;
	}

	@Delete('delete')
	@UseGuards(JwtAuthGuard)
	async deleteUser(@Req() req: Request): Promise<{ message: string }> {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			await this.userService.deleteUserById(req.user.id, user.customImage);
			req.res.clearCookie('token', { sameSite: 'none', secure: true });
			return { message: 'User deleted successfully' };
		} catch (error) {
			//	this.logger.error(`Error deleting user: ${error.message}`, error.stack);
			if (error instanceof NotFoundException) {
				throw new NotFoundException('User not found');
			} else if (error instanceof HttpException) {
				// If error is an instance of HttpException, rethrow it
				throw error;
			} else {
				// For all other errors, consider them as internal server errors
				throw new InternalServerErrorException(
					'An unexpected error occurred while deleting the user',
				);
			}
		}
	}

	@Post('upload-image')
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(FileInterceptor('customImage'))
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
	): Promise<{ message: string }> {
		if (!file || file.size === 0) {
			throw new BadRequestException('No file uploaded or file is empty.');
		}
		const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);
		if (!allowedMimeTypes.has(file.mimetype)) {
			throw new BadRequestException('Invalid file type. Only jpeg/jpg/png files are allowed.');
		}

		const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
		if (file.size > MAX_FILE_SIZE) {
			throw new BadRequestException('File size exceeds the maximum limit of 1MB.');
		}

		if (!(await this.isValidImage(file.buffer))) {
			throw new BadRequestException('Invalid image file.');
		}

		try {
			await this.userService.saveUserImage(req.user.id, file);
			return { message: 'Image uploaded successfully' };
		} catch (error) {
			//this.logger.error(`Error uploading user image: ${error.message}`, error.stack);
			throw new InternalServerErrorException('Could not upload image. Please try again later.');
		}
	}

	private async isValidImage(fileBuffer: Buffer): Promise<boolean> {
		try {
			await sharp(fileBuffer).metadata();
			return true;
		} catch (error) {
			//console.error('Invalid image file:', error);
			return false;
		}
	}

	//get ProfileImage of user
	@UseGuards(JwtAuthGuard)
	@Get('uploads')
	getImage(@Query() getImageDto: GetImageDto, @Req() req: Request, @Res() res: Response) {
		// Construct the full file path
		let fullPath: string = UPLOAD_PATH + getImageDto.filename;

		//works not in public profile but in own
		//TODO: delete me before eval.
		if (/^deb\d+$/.test(req.user.name)) {
			fullPath = `${UPLOAD_PATH}0_0.png`;
		}

		// Check if the file exists and send it, otherwise send a 404 response
		if (fs.existsSync(fullPath) && !fullPath.includes('..')) {
			return res.status(HttpStatus.OK).sendFile(fullPath);
		}
		//console.log('ERROR cant find path: ', fullPath);
		return res.status(HttpStatus.NOT_FOUND).send('File not found');
	}

	@Post('edit-name')
	@UseGuards(JwtAuthGuard)
	async editNickName(
		@Body() editNicknameDto: EditNicknameDto,
		@Req() req: Request,
		@Res() res: Response,
	) {
		const newName = editNicknameDto.nickname;
		// Check if the new name is unique
		const isNameTaken = await this.userService.isNameUnique(req.user.id, newName);
		if (isNameTaken) {
			throw new BadRequestException('This Nickname is already taken.');
		}

		try {
			const returnStatus = await this.userService.updateUserNickName(req.user.id, newName);
			if (returnStatus) {
				res.status(HttpStatus.OK).json({ message: 'Nickname updated successfully' });
			} else {
				res.status(HttpStatus.OK).json({ message: 'Nickname was not changed, choose another one' });
			}
		} catch (error) {
			//console.error('Error updating Nickname:', error);
			throw new HttpException('Failed to update Nickname', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	//Get List of friends of that user
	@Get('friends')
	@UseGuards(JwtAuthGuard)
	async getFriends(@Req() req: Request, @Res() res: Response): Promise<Response> {
		try {
			const user = await this.userService.findProfileById(req.user.id);
			if (!user) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
			}
			if (!user.friends) {
				return res.status(HttpStatus.OK).json([]); // Send an empty array if no friends are found
			}

			const friends = user.friends.map((friend) => {
				const { password, ...friendDetails } = friend; // Exclude sensitive information
				return friendDetails;
			});

			return res.status(HttpStatus.OK).json(friends); // Send the list of friends in the response
		} catch (error) {
			//console.error('Error retrieving friends:', error);
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ message: 'Error retrieving friends' });
		}
	}

	@Delete('friends')
	@UseGuards(JwtAuthGuard)
	async removeFriend(
		@Query() removeFriendDto: RemoveFriendDto,
		@Req() req: Request,
		@Res() res: Response,
	) {
		try {
			const { friendid } = removeFriendDto;
			await this.userService.removeFriend(req.user.id, friendid);
			return res.status(HttpStatus.NO_CONTENT).send();
		} catch (error) {
			const { message } = error as Error;
			let responseMessage = 'An error occurred';
			let status = HttpStatus.INTERNAL_SERVER_ERROR;

			if (error instanceof NotFoundException) {
				status = HttpStatus.NOT_FOUND;
				responseMessage = message;
			} else if (error instanceof Error) {
				// Safe to access error.message
				responseMessage = message;
			}

			return res.status(status).json({ responseMessage });
		}
	}

	@Post('add-friend')
	@UseGuards(JwtAuthGuard)
	async addFriend(
		@Req() req: Request,
		@Body() addFriendDto: AddFriendDto,
		@Res() res: Response,
	): Promise<Response> {
		const user = await this.userService.findProfileById(req.user.id);
		try {
			const updatedUser = await this.userService.addFriend(user, addFriendDto.friendName);
			if (!updatedUser) {
				return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
			}

			return res.status(HttpStatus.OK).json({ message: 'Friend added successfully' });
		} catch (error) {
			console.error('Error adding friend:', error);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error adding friend' });
		}
	}

	@Post('block-user')
	@UseGuards(JwtAuthGuard)
	async blockUser(@Req() req: Request, @Query() blockUserDto: BlockUserDto, @Res() res: Response) {
		const user = await this.userService.findProfileById(req.user.id);
		const userToBlock = await this.userService.findUserbyName(blockUserDto.userName);
		if (!userToBlock) {
			res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
			return;
		}
		if (userToBlock.id === user.id) {
			res.status(HttpStatus.BAD_REQUEST).json({ message: 'You cannot block yourself.' });
			return;
		}
		const friendRequest = await this.friendrequestRepository.findOne({
			where: [
				{ senderId: userToBlock.id, recipientId: user.id, status: 'pending' },
				{ senderId: user.id, recipientId: userToBlock.id, status: 'pending' },
			],
		});
		if (friendRequest) {
			await this.friendrequestRepository.remove(friendRequest);
		}

		try {
			await this.userService.blockUser(user, userToBlock.name);
			await this.userService.removeFriend(user.id, userToBlock.id);
			res.status(HttpStatus.OK).json({ message: 'User blocked successfully' });
		} catch (error) {
			console.error('Error while blocking user: ', error instanceof Error ? error.message : error);

			if (error instanceof NotFoundError) {
				res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
			} else if (error instanceof BadRequestException) {
				res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			} else {
				res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
			}
		}
	}

	@Get('blocked-users')
	@UseGuards(JwtAuthGuard)
	async blockedUsers(@Req() req: Request, @Res() res: Response) {
		try {
			const blockedUsers = await this.userService.findBlockedUsers(req.user.id);
			res.status(HttpStatus.OK).json(blockedUsers);
		} catch (error) {
			if (error instanceof NotFoundException) {
				res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
			} else {
				res
					.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.json({ message: 'Could not retrieve blocked users' });
			}
		}
	}

	@Post('unblock-user')
	@UseGuards(JwtAuthGuard)
	async unblockUser(
		@Req() req: Request,
		@Query() unblockUserDto: UnblockUserDto,
		@Res() res: Response,
	) {
		const user = await this.userService.findProfileById(req.user.id);
		const userToBlock = await this.userService.findProfileById(unblockUserDto.userid);
		try {
			await this.userService.removeUserInBlocklist(user, userToBlock.name);
			res.status(HttpStatus.OK).json({ message: 'User unblocked successfully' });
		} catch (error) {
			console.error(
				'Error while unblocking user: ',
				error instanceof Error ? error.message : error,
			);

			if (error instanceof NotFoundError) {
				res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
			} else if (error instanceof BadRequestException) {
				res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
			} else {
				res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
			}
		}
	}

	@Get('public-profile')
	@UseGuards(JwtAuthGuard)
	async getPublicProfile(@Query() getPublicProfileDto: GetPublicProfileDto) {
		const friendProfile = await this.userService.findProfileByName(getPublicProfileDto.friendname);
		// Exclude password and other sensitive fields from the result
		const { password, id, intraId, blocklist, has2FA, unconfirmed2FASecret, TFASecret, ...result } =
			friendProfile;

		return result;
	}

	//Debug: TODO: Delete for eval
	//This is a hypothetical service method that you would call to create a debug user.
	@Post('create-debug-user')
	async createDebugUser(@Res() res: Response) {
		const debugUserId = uuidv4();
		number++;
		const stringNum = number.toString();
		// Create a new User entity
		const debugUser = await this.userService.createDebugUser({
			name: `deb${stringNum}`,
			nickname: `Debugger_${stringNum}`,
			email: `${stringNum}@debuguser.com`,
			password: '1',
			intraId: debugUserId,
			id: debugUserId,
			intraImage: 'someDebugIntraImage',
			customImage: 'http://localhost:8080/user/uploads?filename=0_0.png',
			status: 'offline',
		});

		const debugToken = this.userService.createDebugToken(debugUser);

		// Respond with the newly created debug user's ID and the fake token
		res.status(HttpStatus.CREATED).json({
			message: `${debugUser.name} created`,
			id: debugUser.id,
			token: debugToken, // Include the token in the response
		});
	}

	//DO NOT USE IN FRONTEND CODE!
	//########################Debug#############################	//TODO: delete before eval
	//returns all users for debug, TODO delete that function before eval.
	@Get('users')
	async getAll(): Promise<User[]> {
		return this.userService.findAll();
	}
}
