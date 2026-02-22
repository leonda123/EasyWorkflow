import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, MinLength, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsBoolean()
  createDefaultTeam?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}
