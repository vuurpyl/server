import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { ProfileService } from '@domain/community/profile/profile.service';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  NotSupportedException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { UserGroup, IUserGroup } from '@domain/community/user-group';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IProfile } from '@domain/community/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  AssignUserGroupMemberInput,
  CreateUserGroupInput,
  DeleteUserGroupInput,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from './dto';

@Injectable()
export class UserGroupService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private agentService: AgentService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(
    userGroupData: CreateUserGroupInput,
    hubID = ''
  ): Promise<IUserGroup> {
    const group = UserGroup.create(userGroupData);
    group.hubID = hubID;
    group.authorization = new AuthorizationPolicy();

    (group as IUserGroup).profile = await this.profileService.createProfile(
      userGroupData.profileData
    );
    const savedUserGroup = await this.userGroupRepository.save(group);
    this.logger.verbose?.(
      `Created new group (${group.id}) with name: ${group.name}`,
      LogContext.COMMUNITY
    );
    return savedUserGroup;
  }
  async removeUserGroup(deleteData: DeleteUserGroupInput): Promise<IUserGroup> {
    const groupID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const group = (await this.getUserGroupOrFail(groupID)) as UserGroup;

    if (group.profile) {
      await this.profileService.deleteProfile(group.profile.id);
    }

    if (group.authorization)
      await this.authorizationPolicyService.delete(group.authorization);

    // Remove all issued membership credentials
    const members = await this.getMembers(group.id);
    for (const member of members) {
      await this.removeUser({ userID: member.id, groupID: group.id });
    }

    const { id } = group;
    const result = await this.userGroupRepository.remove(group);
    return {
      ...result,
      id,
    };
  }

  async updateUserGroup(
    userGroupInput: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(userGroupInput.ID);

    const newName = userGroupInput.name;
    if (newName && newName.length > 0 && newName !== group.name) {
      group.name = newName;
    }

    if (userGroupInput.profileData) {
      group.profile = await this.profileService.updateProfile(
        userGroupInput.profileData
      );
    }

    return await this.userGroupRepository.save(group);
  }

  async saveUserGroup(group: IUserGroup): Promise<IUserGroup> {
    return await this.userGroupRepository.save(group);
  }

  async getParent(group: IUserGroup): Promise<IGroupable> {
    const groupWithParent = (await this.getUserGroupOrFail(group.id, {
      relations: ['community', 'organization'],
    })) as UserGroup;
    if (groupWithParent?.community) return groupWithParent?.community;
    if (groupWithParent?.organization) return groupWithParent?.organization;
    throw new EntityNotFoundException(
      `Unable to locate parent for user group: ${group.name}`,
      LogContext.COMMUNITY
    );
  }

  async getUserGroupOrFail(
    groupID: string,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup> {
    //const t1 = performance.now()
    const group = await this.userGroupRepository.findOne(
      { id: groupID },
      options
    );
    if (!group)
      throw new EntityNotFoundException(
        `Unable to find group with ID: ${groupID}`,
        LogContext.COMMUNITY
      );
    return group;
  }

  async assignUser(
    membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: ['community'],
    });
  }

  async removeUser(
    membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: ['community'],
    });
  }

  private hasGroupWithName(groupable: IGroupable, name: string): boolean {
    // Double check groups array is initialised
    if (!groupable.groups) {
      throw new EntityNotInitializedException(
        'Non-initialised Groupable submitted',
        LogContext.COMMUNITY
      );
    }

    // Find the right group
    for (const group of groupable.groups) {
      if (group.name === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  async addGroupWithName(
    groupable: IGroupable,
    name: string,
    hubID?: string
  ): Promise<IUserGroup> {
    // Check if the group already exists, if so log a warning
    const alreadyExists = this.hasGroupWithName(groupable, name);
    if (alreadyExists) {
      throw new NotSupportedException(
        `Unable to create user group as parent already has a group with the given name: ${name}`,
        LogContext.COMMUNITY
      );
    }

    const newGroup = await this.createUserGroup(
      {
        name: name,
        parentID: groupable.id,
      },
      hubID
    );
    await groupable.groups?.push(newGroup);
    return newGroup;
  }

  async getMembers(groupID: string): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: groupID,
    });
  }

  async getGroups(
    conditions?: FindConditions<UserGroup>
  ): Promise<IUserGroup[]> {
    return (await this.userGroupRepository.find(conditions)) || [];
  }

  async getGroupsWithTag(
    tagFilter: string,
    conditions?: FindConditions<UserGroup>
  ): Promise<IUserGroup[]> {
    const groups = await this.getGroups(conditions);
    return groups.filter(g => {
      if (!tagFilter) {
        return true;
      }

      if (!g.profile) return false;

      const tagset = this.tagsetService.defaultTagset(g.profile);

      return (
        tagset !== undefined && this.tagsetService.hasTag(tagset, tagFilter)
      );
    });
  }

  getProfile(userGroup: IUserGroup): IProfile {
    const profile = userGroup.profile;
    if (!profile)
      throw new EntityNotInitializedException(
        `UserGroup Profile not initialized: ${userGroup.id}`,
        LogContext.COMMUNITY
      );
    return profile;
  }
}
