import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class CreateGlobalApiKeyDto {
  @IsOptional()
  @IsString()
  customKey?: string;
}

export class CreateWorkflowApiKeyDto {
  @IsOptional()
  @IsString()
  customKey?: string;
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  customKey?: string;
}

export class ToggleApiKeyDto {
  @IsBoolean()
  enabled: boolean;
}

export class ValidateApiKeyDto {
  @IsString()
  key: string;
}
