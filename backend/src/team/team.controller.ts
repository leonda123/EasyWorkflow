import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTeamDto, UpdateTeamDto, InviteMemberDto, UpdateMemberRoleDto } from './team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateTeamDto) {
    return this.teamService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.teamService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.teamService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.teamService.delete(req.user.id, id);
  }

  @Post(':id/members')
  inviteMember(@Request() req: any, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.teamService.inviteMember(req.user.id, id, dto);
  }

  @Put(':id/members/:memberId')
  updateMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(req.user.id, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(req.user.id, id, memberId);
  }

  @Post(':id/leave')
  leaveTeam(@Request() req: any, @Param('id') id: string) {
    return this.teamService.leaveTeam(req.user.id, id);
  }
}
