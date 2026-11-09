
import
    {
        createParamDecorator,
        ExecutionContext,
    } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string =>
    {
        const request = ctx
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        return request.user.id;
    },
);
