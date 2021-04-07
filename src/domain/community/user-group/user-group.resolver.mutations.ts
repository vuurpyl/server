import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { UpdateUserGroupInput } from '@domain/community/user-group';
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';

@Resolver(() => UserGroup)
export class UserGroupResolverMutations {
  constructor(private groupService: UserGroupService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Removes the user group with the specified ID',
  })
  async removeUserGroup(
    @Args('removeData') removeData: RemoveEntityInput
  ): Promise<IUserGroup> {
    return await this.groupService.removeUserGroup(removeData, true);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Update the user group information.',
  })
  @Profiling.api
  async updateUserGroup(
    @Args('userGroupData') userGroupData: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    return await this.groupService.updateUserGroup(userGroupData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Adds the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async addUserToGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<boolean> {
    const res = await this.groupService.addUser(userID, groupID);
    return res;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Remove the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.removeUser(userID, groupID);
    return group;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description:
      'Assign the user with the given ID as focal point for the given group',
  })
  @Profiling.api
  async assignGroupFocalPoint(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.assignFocalPoint(userID, groupID);
    return group;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description: 'Remove the focal point for the given group',
  })
  @Profiling.api
  async removeGroupFocalPoint(
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.removeFocalPoint(groupID);
    return group;
  }
}
