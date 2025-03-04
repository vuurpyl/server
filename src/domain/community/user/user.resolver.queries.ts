import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CredentialMetadataOutput } from '@domain/agent/verified-credential/dto/verified.credential.dto.metadata';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { PaginationArgs, PaginatedUsers } from '@core/pagination';
import { UserService } from './user.service';
import { IUser } from './';
import { UserFilterInput } from '@core/filtering';
import { PlatformAuthorizationService } from '@src/platform/authorization/platform.authorization.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private userService: UserService,
    private agentService: AgentService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );
    return await this.userService.getUsers(args);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => PaginatedUsers, {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async usersPaginated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );

    return this.userService.getPaginatedUsers(pagination, filter);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID_NAMEID_EMAIL }) id: string
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user query: ${agentInfo.email}`
    );
    return await this.userService.getUserOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'IDs', type: () => [UUID] }) ids: string[]
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );
    return await this.userService.getUsersByIDs(ids);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => Boolean, {
    nullable: false,
    description: 'Check if the currently logged in user has a User profile',
  })
  @Profiling.api
  async meHasProfile(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      return false;
    }
    return true;
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'The currently logged in user',
  })
  @Profiling.api
  async me(@CurrentUser() agentInfo: AgentInfo): Promise<IUser> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserNotRegisteredException();
    }
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [CredentialMetadataOutput], {
    nullable: false,
    description: 'Get supported credential metadata',
  })
  @Profiling.api
  async getSupportedVerifiedCredentialMetadata(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CredentialMetadataOutput[]> {
    const userID = agentInfo.userID;
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    return await this.agentService.getSupportedCredentialMetadata();
  }
}
