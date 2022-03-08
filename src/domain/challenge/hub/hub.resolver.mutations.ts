import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { HubService } from './hub.service';
import {
  CreateHubInput,
  DeleteHubInput,
  UpdateHubInput,
} from '@domain/challenge/hub';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { HubAuthorizationService } from './hub.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IHub } from './hub.interface';
import { IUser } from '@domain/community/user/user.interface';
import { AssignHubAdminInput } from './dto/hub.dto.assign.admin';
import { RemoveHubAdminInput } from './dto/hub.dto.remove.admin';
import { HubAuthorizationResetInput } from './dto/hub.dto.reset.authorization';
import { CreateChallengeOnHubInput } from '../challenge/dto/challenge.dto.create.in.hub';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
@Resolver()
export class HubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private hubService: HubService,
    private hubAuthorizationService: HubAuthorizationService,
    private challengeAuthorizationService: ChallengeAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Creates a new Hub.',
  })
  @Profiling.api
  async createHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('hubData') hubData: CreateHubInput
  ): Promise<IHub> {
    const authorizatinoPolicy =
      this.authorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizatinoPolicy,
      AuthorizationPrivilege.CREATE_HUB,
      `updateHub: ${hubData.nameID}`
    );
    const hub = await this.hubService.createHub(hubData, agentInfo);
    return await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Updates the Hub.',
  })
  @Profiling.api
  async updateHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('hubData') hubData: UpdateHubInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(hubData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateHub: ${hub.nameID}`
    );

    // ensure working with UUID
    hubData.ID = hub.id;

    return await this.hubService.update(hubData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Deletes the specified Hub.',
  })
  async deleteHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteHubInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteHub: ${hub.nameID}`
    );
    return await this.hubService.deleteHub(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Hub.',
  })
  @Profiling.api
  async createChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeOnHubInput
  ): Promise<IChallenge> {
    const hub = await this.hubService.getHubOrFail(challengeData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.CREATE,
      `challengeCreate: ${hub.nameID}`
    );
    const challenge = await this.hubService.createChallengeInHub(
      challengeData,
      agentInfo
    );
    return await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      hub.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IHub, {
    description: 'Reset the Authorization Policy on the specified Hub.',
  })
  @Profiling.api
  async authorizationPolicyResetOnHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: HubAuthorizationResetInput
  ): Promise<IHub> {
    const hub = await this.hubService.getHubOrFail(
      authorizationResetData.hubID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition: ${agentInfo.email}`
    );
    return await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Hub Admin.',
  })
  @Profiling.api
  async assignUserAsHubAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignHubAdminInput
  ): Promise<IUser> {
    const hub = await this.hubService.getHubOrFail(membershipData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user hub admin: ${hub.displayName}`
    );
    return await this.hubService.assignHubAdmin(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Hub Admin.',
  })
  @Profiling.api
  async removeUserAsHubAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveHubAdminInput
  ): Promise<IUser> {
    const hub = await this.hubService.getHubOrFail(membershipData.hubID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user hub admin: ${hub.displayName}`
    );
    return await this.hubService.removeHubAdmin(membershipData);
  }
}
