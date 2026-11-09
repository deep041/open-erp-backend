
import
    {
        IsEmail,
        IsString,
        MaxLength,
        MinLength,
    } from 'class-validator';

export class RegisterDto
{
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(12)
    @MaxLength(128)
    password: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstName: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    lastName: string;
}
