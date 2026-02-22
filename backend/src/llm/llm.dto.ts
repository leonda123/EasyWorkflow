import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min, Max, IsUrl, IsIn, IsUUID, IsArray } from 'class-validator';

export class CreateLlmConfigDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['openai', 'deepseek', 'zhipu', 'moonshot', 'qwen', 'custom'])
  provider: string;

  @IsString()
  baseUrl: string;

  @IsString()
  apiKey: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class UpdateLlmConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class ChatDto {
  @IsOptional()
  @IsString()
  configId?: string;

  @IsArray()
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsInt()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

export class TestConfigDto {
  @IsOptional()
  @IsString()
  configId?: string;
}
