/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { CreateActorGroupInput } from '@domain/context/actor-group';
import {
  CreateChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { CreateContextInput } from '@domain/context/context';
import { UpdateHubInput } from '@domain/challenge/hub/dto/hub.dto.update';
import { CreateOrganizationInput } from '@domain/community/organization';
import { CreateProfileInput } from '@domain/community/profile';
import {
  CreateProjectInput,
  UpdateProjectInput,
} from '@domain/collaboration/project';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CreateUserInput, UpdateUserInput } from '@domain/community/user';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';
import { CreateApplicationInput } from '@domain/community/application';
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { UpdateUserGroupInput } from '@domain/community/user-group';
import { CreateAspectOnContextInput } from '@domain/context/context/dto/context.dto.create.aspect';
import { CreateAspectInput } from '@domain/context/aspect/dto/aspect.dto.create';
import { UpdateAspectTemplateInput } from '@domain/challenge/hub/dto/hub.dto.update.template.aspect';
import { UpdateHubTemplateInput } from '@domain/challenge/hub/dto/hub.dto.update.template';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      CreateApplicationInput,
      CreateActorGroupInput,
      CreateAspectOnContextInput,
      CreateChallengeInput,
      CreateContextInput,
      CreateOpportunityInput,
      // CreateOrganizationInput,
      CreateProfileInput,
      CreateProjectInput,
      CreateReferenceInput,
      CreateRelationInput,
      CreateTagsetInput,
      CreateUserInput,
      CreateAspectInput,
      UpdateHubInput,
      UpdateOpportunityInput,
      UpdateChallengeInput,
      UpdateUserGroupInput,
      UpdateUserInput,
      UpdateProjectInput,
      UpdateAspectTemplateInput,
      UpdateHubTemplateInput,
    ];

    if (types.includes(metatype)) {
      const errors = await validate(value);
      if (errors.length > 0) {
        throw new ValidationException(
          `DTO validation for ${metatype} failed! ${errors}`,
          LogContext.API
        );
      }
    }
    return super.handle(value, metatype);
  }
}
