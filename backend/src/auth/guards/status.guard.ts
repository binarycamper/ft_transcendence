import {
	Injectable,
	CanActivate,
	ExecutionContext,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { use } from 'passport';
import { Observable } from 'rxjs';

@Injectable()
export class StatusGuard implements CanActivate {
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const request = context.switchToHttp().getRequest();
		const user = request.user?.id;

		console.log('user:: ', user);
		if (!user) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		if (user.status === 'fresh') {
			throw new HttpException(
				{
					status: HttpStatus.SEE_OTHER,
					error: 'Please complete your profile',
					location: '/complete', // You might need to adjust this based on how you handle routing on the client side.
				},
				HttpStatus.SEE_OTHER,
			);
		}

		return true;
	}
}
