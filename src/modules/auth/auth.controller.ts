
import
    {
        Body,
        Controller,
        Get,
        HttpCode,
        HttpStatus,
        Post,
        Req,
        Res,
        UnauthorizedException,
        UseGuards,
    } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import
    {
        clearRefreshCookie,
        REFRESH_COOKIE,
        setRefreshCookie,
    } from './refresh-cookie';

@Controller('auth')
export class AuthController
{
    constructor(private readonly auth: AuthService) { }

    private get isProduction()
    {
        return process.env.NODE_ENV === 'production';
    }

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) response: Response,
    )
    {
        const { refreshToken, ...result } =
            await this.auth.register(dto);

        setRefreshCookie(
            response,
            refreshToken,
            this.isProduction,
        );

        return result;
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    )
    {
        const { refreshToken, ...result } =
            await this.auth.login(dto);

        setRefreshCookie(
            response,
            refreshToken,
            this.isProduction,
        );

        return result;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    )
    {
        const token = request.cookies?.[REFRESH_COOKIE];

        if (!token)
        {
            throw new UnauthorizedException(
                'Refresh token missing',
            );
        }

        const result = await this.auth.refresh(token);

        setRefreshCookie(
            response,
            result.refreshToken,
            this.isProduction,
        );

        return {
            accessToken: result.accessToken,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    )
    {
        const token = request.cookies?.[REFRESH_COOKIE];

        if (token)
        {
            await this.auth.logout(token);
        }

        clearRefreshCookie(response, this.isProduction);

        return { message: 'Logged out successfully' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    me(@CurrentUser() userId: string)
    {
        return this.auth.getMe(userId);
    }
}
