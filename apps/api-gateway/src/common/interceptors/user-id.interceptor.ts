import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtUser } from '../../modules/auth/jwt.strategy';

@Injectable()
export class UserIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as JwtUser | undefined;
    if (user?.sub) req.headers['x-user-id'] = user.sub;
    return next.handle();
  }
}
