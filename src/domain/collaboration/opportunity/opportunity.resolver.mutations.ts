import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import {} from '@domain/context/actor-group';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { CreateProjectInput, IProject } from '@domain/collaboration/project';
import { GraphqlGuard } from '@core/authorization';
import { OpportunityService } from './opportunity.service';
import { AuthorizationPrivilege } from '@common/enums';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RelationAuthorizationService } from '../relation/relation.service.authorization';
import { IUser } from '@domain/community/user/user.interface';
import { RemoveOpportunityAdminInput } from './dto/opportunity.dto.remove.admin';
import { AssignOpportunityAdminInput } from './dto/opportunity.dto.assign.admin';
import { IOpportunity } from './opportunity.interface';
import {
  DeleteOpportunityInput,
  OpportunityEventInput,
  UpdateOpportunityInput,
} from './dto';

@Resolver()
export class OpportunityResolverMutations {
  constructor(
    private relationAuthorizationService: RelationAuthorizationService,
    private projectService: ProjectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationEngine: AuthorizationEngineService,
    private opportunityService: OpportunityService,
    private opportunityLifecycleOptionsProvider: OpportunityLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Updates the specified Opportunity.',
  })
  @Profiling.api
  async updateOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('opportunityData') opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `update opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityService.updateOpportunity(opportunityData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Deletes the specified Opportunity.',
  })
  async deleteOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.DELETE,
      `delete opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityService.deleteOpportunity(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Create a new Project on the Opportunity',
  })
  @Profiling.api
  async createProject(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('projectData') projectData: CreateProjectInput
  ): Promise<IProject> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      projectData.opportunityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `create project (${projectData.nameID}) on Opportunity: ${opportunity.nameID}`
    );
    const project = await this.opportunityService.createProject(projectData);
    project.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        project.authorization,
        opportunity.authorization
      );
    return await this.projectService.saveProject(project);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createRelation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      relationData.parentID
    );
    // Extend the authorization definition to use for creating the relation
    const authorization =
      this.relationAuthorizationService.localExtendAuthorizationPolicy(
        opportunity.authorization
      );
    // First check if the user has read access
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      `create relation: ${opportunity.nameID}`
    );
    // Then check if the user can create
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create relation: ${opportunity.nameID}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const oppAuthorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const relation = await this.opportunityService.createRelation(relationData);
    return await this.relationAuthorizationService.applyAuthorizationPolicy(
      relation,
      oppAuthorization,
      agentInfo.userID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Trigger an event on the Opportunity.',
  })
  async eventOnOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('opportunityEventData')
    opportunityEventData: OpportunityEventInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityEventData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityLifecycleOptionsProvider.eventOnOpportunity(
      {
        eventName: opportunityEventData.eventName,
        ID: opportunityEventData.ID,
      },
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Opportunity Admin.',
  })
  @Profiling.api
  async assignUserAsOpportunityAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOpportunityAdminInput
  ): Promise<IUser> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      membershipData.opportunityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user opportunity admin: ${opportunity.displayName}`
    );
    return await this.opportunityService.assignOpportunityAdmin(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Opportunity Admin.',
  })
  @Profiling.api
  async removeUserAsOpportunityAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOpportunityAdminInput
  ): Promise<IUser> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      membershipData.opportunityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user opportunity admin: ${opportunity.displayName}`
    );
    return await this.opportunityService.removeOpportunityAdmin(membershipData);
  }
}
