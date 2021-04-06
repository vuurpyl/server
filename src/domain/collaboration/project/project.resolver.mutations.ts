import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { CreateAspectInput } from '@domain/context/aspect';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { ProjectService } from './project.service';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import {
  UpdateProjectInput,
  Project,
  IProject,
} from '@domain/collaboration/project';
@Resolver()
export class ProjectResolverMutations {
  constructor(private projectService: ProjectService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Project with the specified ID',
  })
  async removeProject(@Args('ID') ProjectID: number): Promise<boolean> {
    return await this.projectService.removeProject(ProjectID);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Updates the Project with the specified ID',
  })
  async updateProject(
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    return await this.projectService.updateProject(projectData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Project identified by the ID',
  })
  @Profiling.api
  async createAspectOnProject(
    @Args('projectID') projectId: number,
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.projectService.createAspect(
      projectId,
      aspectData
    );
    return aspect;
  }
}
