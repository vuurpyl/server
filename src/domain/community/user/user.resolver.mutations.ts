import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { UserAuthorizationService } from './user.service.authorization';
import { UserSendMessageInput } from './dto/user.dto.communication.message.send';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { CommunicationAdapterService } from '@services/platform/communication-adapter/communication.adapter.service';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private readonly communicationAdapterService: CommunicationAdapterService,
    private authorizationService: AuthorizationService,
    private readonly userService: UserService,
    private readonly userAuthorizationService: UserAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      this.userAuthorizationService.createUserAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${agentInfo.email}`
    );
    let user = await this.userService.createUser(userData);
    user = await this.userAuthorizationService.grantCredentials(user);
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Creates a new User profile on the platform for a user that has a valid Authentication session.',
  })
  @Profiling.api
  async createUserNewRegistration(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    // If a user has a valid session, and hence email / names etc set, then they can create a User profile
    let user = await this.userService.createUserFromAgentInfo(agentInfo);
    user = await this.userAuthorizationService.grantCredentials(user);
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Updates the User.',
  })
  @Profiling.api
  async updateUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(userData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `userUpdate: ${user.nameID}`
    );
    return await this.userService.updateUser(userData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.nameID}`
    );
    return await this.userService.deleteUser(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Sends a message on the specified User`s behalf and returns the room id',
  })
  @Profiling.api
  async messageUser(
    @Args('messageData') messageData: UserSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const receivingUser = await this.userService.getUserOrFail(
      messageData.receivingUserID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user send message: ${receivingUser.nameID}`
    );

    return await this.communicationAdapterService.sendMessageToUser({
      senderCommunicationsID: agentInfo.communicationID,
      message: messageData.message,
      receiverCommunicationsID: receivingUser.communicationID,
    });
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Reset the Authorization policy on the specified User.',
  })
  @Profiling.api
  async authorizationPolicyResetOnUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: UserAuthorizationResetInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(
      authorizationResetData.userID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition on user: ${authorizationResetData.userID}`
    );
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }
}
