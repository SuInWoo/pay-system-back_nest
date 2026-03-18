import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLE_CODE } from '../users/entities/role.entity';
import { UpdateUserRoleDto } from '../users/dto/update-user-role.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { MenusService } from '../menus/menus.service';
import { CreateMenuDto } from '../menus/dto/create-menu.dto';
import { UpdateMenuDto } from '../menus/dto/update-menu.dto';
import { SetRoleMenusDto } from '../menus/dto/set-role-menus.dto';

@ApiTags('관리자 (Admin)')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Roles(ROLE_CODE.DEVELOPER, ROLE_CODE.CLIENT_ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly menusService: MenusService,
  ) {}

  @Get('roles')
  @ApiOperation({ summary: '역할 목록 조회' })
  @ApiResponse({ status: 200, description: 'DEVELOPER, CLIENT_ADMIN, CUSTOMER' })
  listRoles() {
    return this.authService.listRoles();
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: '사용자 역할 변경' })
  @ApiParam({ name: 'id', description: '사용자 UUID' })
  @ApiResponse({ status: 200, description: '변경된 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Get('menus')
  @ApiOperation({ summary: '메뉴 목록 조회 (트리)' })
  @ApiResponse({ status: 200, description: '메뉴 트리' })
  listMenus() {
    return this.menusService.listMenus({ tree: true });
  }

  @Post('menus')
  @ApiOperation({ summary: '메뉴 생성' })
  @ApiResponse({ status: 201, description: '생성된 메뉴' })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED / MENU_CODE_CONFLICT' })
  createMenu(@Body() dto: CreateMenuDto) {
    return this.menusService.createMenu(dto);
  }

  @Get('menus/:id')
  @ApiOperation({ summary: '메뉴 단건 조회' })
  @ApiParam({ name: 'id', description: '메뉴 UUID' })
  @ApiResponse({ status: 200, description: '메뉴' })
  @ApiResponse({ status: 404, description: 'MENU_NOT_FOUND' })
  getMenu(@Param('id') id: string) {
    return this.menusService.getMenu(id);
  }

  @Patch('menus/:id')
  @ApiOperation({ summary: '메뉴 수정' })
  @ApiParam({ name: 'id', description: '메뉴 UUID' })
  @ApiResponse({ status: 200, description: '수정된 메뉴' })
  @ApiResponse({ status: 404, description: 'MENU_NOT_FOUND' })
  updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menusService.updateMenu(id, dto);
  }

  @Delete('menus/:id')
  @ApiOperation({ summary: '메뉴 삭제' })
  @ApiParam({ name: 'id', description: '메뉴 UUID' })
  @ApiResponse({ status: 204, description: '삭제 완료' })
  @ApiResponse({ status: 404, description: 'MENU_NOT_FOUND' })
  async deleteMenu(@Param('id') id: string) {
    await this.menusService.deleteMenu(id);
  }

  @Get('roles/:roleId/menus')
  @ApiOperation({ summary: '역할별 메뉴 ID 목록' })
  @ApiParam({ name: 'roleId', description: '역할 UUID' })
  getRoleMenus(@Param('roleId') roleId: string) {
    return this.menusService.getMenusByRoleId(roleId);
  }

  @Patch('roles/:roleId/menus')
  @ApiOperation({ summary: '역할별 메뉴 설정' })
  @ApiParam({ name: 'roleId', description: '역할 UUID' })
  setRoleMenus(@Param('roleId') roleId: string, @Body() dto: SetRoleMenusDto) {
    return this.menusService.setMenusForRole(roleId, dto.menuIds);
  }
}
