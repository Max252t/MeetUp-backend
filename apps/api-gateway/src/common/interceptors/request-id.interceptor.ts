import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
    req.headers['x-request-id'] = requestId;
    const res = context.switchToHttp().getResponse();
    res.header('x-request-id', requestId);
    return next.handle();
  }
}
