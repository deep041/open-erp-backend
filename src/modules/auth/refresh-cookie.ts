
import { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'erp_refresh';

const sevenDays = 7 * 24 * 60 * 60 * 1000;

export function refreshCookieOptions(
    isProduction: boolean,
): CookieOptions
{
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: sevenDays,
    };
}

export function setRefreshCookie(
    response: Response,
    token: string,
    isProduction: boolean,
)
{
    response.cookie(
        REFRESH_COOKIE,
        token,
        refreshCookieOptions(isProduction),
    );
}

export function clearRefreshCookie(
    response: Response,
    isProduction: boolean,
)
{
    const { maxAge, ...options } =
        refreshCookieOptions(isProduction);

    response.clearCookie(REFRESH_COOKIE, options);
}
