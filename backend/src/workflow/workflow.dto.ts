import { IsString, IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  definition?: any;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  definition?: any;
}

export class DeployWorkflowDto {
  @IsString()
  versionStr: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ImportWorkflowDto {
  @IsObject()
  data: {
    meta: {
      name: string;
      description?: string;
    };
    nodes: any[];
    edges: any[];
  };
}

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  targetNodeId?: string;

  @IsOptional()
  @IsObject()
  input?: any;
}

export class UpdateStatusDto {
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';
}
