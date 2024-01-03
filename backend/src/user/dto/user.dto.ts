import {
	IsBoolean,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
	Length,
	MinLength,
} from 'class-validator';

export class CompleteProfileDto {
	@IsStrongPassword()
	@IsNotEmpty({ message: 'Password is required.' })
	@MinLength(1, {
		message: 'Password must be at least 1 characters long.',
	})
	password: string;
}

export class EditNicknameDto {
	@IsString()
	@IsNotEmpty()
	@Length(1, 100)
	nickname: string;
}

export class GetUserNameDto {
	@IsString()
	@IsNotEmpty()
	readonly senderid: string;
}

export class DeleteUserDto {
	@IsBoolean()
	@IsNotEmpty()
	readonly confirm: boolean;
}

/*
In your NestJS UserController, you should consider using Data Transfer Objects (DTOs) in methods where you are receiving data from the client (via @Body, @Query, @Param, etc.). DTOs are helpful for validation, transformation, and ensuring that the data you receive is in the correct shape and type. Here's a list of the methods in your controller where you should ideally use DTOs:

    deleteUser: This method receives a confirm query parameter. A DTO could be used to validate this boolean value.

    getImage: This method receives a filename via @Query. A DTO can be used to encapsulate and validate this parameter.

    editNickName: You are correctly using EditNicknameDto here.

    removeFriend: This method receives a friendid via @Query. A DTO can be used here for validation and encapsulation.

    addFriend: While you're receiving friendName via @Body, it's directly taken as a string. Instead, a DTO should be used to encapsulate this data.

    blockUser: This method receives userName via @Query. A DTO would be appropriate here to validate and encapsulate the query parameters.

    unblockUser: Here, userid is received via @Query. A DTO should be used for validation and encapsulation.

    getPublicProfile: The method receives friendname via @Query. Using a DTO here would be beneficial for validation purposes.

*/
