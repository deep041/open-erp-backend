
import
    {
        ConflictException,
        Injectable,
        UnauthorizedException,
    } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshSessionService } from './refresh-session.service';

@Injectable()
export class AuthService
{
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly refreshSessions: RefreshSessionService
    ) { }

    async register(dto: RegisterDto)
    {
        const email = dto.email.trim().toLowerCase();

        const existing = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existing)
        {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        let user;

        try
        {
            user = await this.prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName: dto.firstName.trim(),
                    lastName: dto.lastName.trim(),
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        } catch (error)
        {
            // A concurrent registration may have inserted
            // the same email after our initial lookup.
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002'
            )
            {
                throw new ConflictException('Email already registered');
            }

            throw error;
        }

        const accessToken = await this.createAccessToken(user.id);
        const refreshToken = await this.refreshSessions.create(user.id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async login(dto: LoginDto)
    {
        const email = dto.email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive)
        {
            throw new UnauthorizedException('Invalid credentials');
        }

        const valid = await bcrypt.compare(
            dto.password,
            user.passwordHash,
        );

        if (!valid)
        {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = await this.createAccessToken(user.id);
        const refreshToken = await this.refreshSessions.create(user.id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async getMe(userId: string)
    {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, isActive: true },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
            },
        });

        if (!user)
        {
            throw new UnauthorizedException();
        }

        return user;
    }

    private createAccessToken(userId: string)
    {
        return this.jwtService.signAsync({
            sub: userId,
        });
    }


    async refresh(token: string)
    {
        const rotated = await this.refreshSessions.rotate(token);

        const accessToken = await this.createAccessToken(
            rotated.userId,
        );

        return {
            accessToken,
            refreshToken: rotated.refreshToken,
        };
    }

    async logout(token: string)
    {
        await this.refreshSessions.revoke(token);

        return {
            message: 'Logged out successfully',
        };
    }

}
