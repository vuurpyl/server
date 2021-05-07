import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { UserGroup } from './user-group.entity';
import { UserGroupService } from './user-group.service';
import { UserGroupParent } from './user-group-parent.dto';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { User } from '@domain/community/user/user.entity';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';

@Resolver(() => UserGroup)
export class UserGroupResolverFields {
  constructor(private userGroupService: UserGroupService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('parent', () => UserGroupParent, {
    nullable: true,
    description: 'Containing entity for this UserGroup.',
  })
  @Profiling.api
  async parent(@Parent() userGroup: UserGroup) {
    return await this.userGroupService.getParent(userGroup);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('members', () => [User], {
    nullable: true,
    description: 'The Users that are members of this User Group.',
  })
  @Profiling.api
  async members(@Parent() group: UserGroup): Promise<User[]> {
    if (!group || !group.membersPopulationEnabled) return [];

    const members = await this.userGroupService.getMembers(group.id);
    return (members || []) as User[];
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('focalPoint', () => User, {
    nullable: true,
    description: 'The User that is the focal point of this User Group.',
  })
  @Profiling.api
  async focalPoint(
    @Parent() group: UserGroup
  ): Promise<User | null | undefined> {
    const groupWithFocalPoint = await this.userGroupService.getUserGroupByIdOrFail(
      group.id,
      {
        relations: ['focalPoint'],
      }
    );
    return groupWithFocalPoint.focalPoint as User;
  }
}
