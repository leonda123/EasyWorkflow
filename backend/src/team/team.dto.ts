import { IsString, IsOptional, IsEmail, IsEnum, IsArray } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatarColor?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarColor?: string;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'])
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export class UpdateMemberRoleDto {
  @IsEnum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'])
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
}
