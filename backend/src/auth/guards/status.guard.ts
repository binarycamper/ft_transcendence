import {
	Injectable,
	CanActivate,
	ExecutionContext,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class StatusGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const request: Express.Request = context.switchToHttp().getRequest();
		const { user } = request;

		//console.log('user:: ', user);

		//if used without jwt-guard, because jwt-guard also handle that but without redirect:
		if (!user) {
			throw new HttpException(
				{
					status: HttpStatus.UNAUTHORIZED,
					error: 'Please login',
				},
				HttpStatus.UNAUTHORIZED,
			);
		}

		if (user.status === 'fresh') {
			//console.log('StatusGuard detect fresh user');
			throw new HttpException(
				{
					status: HttpStatus.SEE_OTHER,
					error: 'Please complete your profile',
				},
				HttpStatus.SEE_OTHER,
			);
		}

		return true;
	}
}
