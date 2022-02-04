import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextService } from './context.service';
import { Context, IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): Promise<IContext> {
    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        parentAuthorization
      );

    context.authorization = this.appendCredentialRules(
      context.authorization,
      context.id,
      communityCredential
    );
    context.authorization = this.appendPrivilegeRules(context.authorization);
    // cascade
    context.ecosystemModel = await this.contextService.getEcosystemModel(
      context
    );
    context.ecosystemModel.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        context.ecosystemModel.authorization,
        context.authorization
      );
    context.ecosystemModel =
      await this.ecosysteModelAuthorizationService.applyAuthorizationPolicy(
        context.ecosystemModel
      );

    context.aspects = await this.contextService.getAspects(context);
    for (const aspect of context.aspects) {
      aspect.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          aspect.authorization,
          context.authorization
        );
    }

    context.visuals = await this.contextService.getVisuals(context);
    for (const visual of context.visuals) {
      visual.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          visual.authorization,
          context.authorization
        );
    }

    context.canvases = await this.contextService.getCanvases(context);
    for (const canvas of context.canvases) {
      await this.canvasAuthorizationService.applyAuthorizationPolicy(
        canvas,
        context.authorization
      );
    }

    context.references = await this.contextService.getReferences(context);
    for (const reference of context.references) {
      if (!reference.authorization) {
        reference.authorization = new AuthorizationPolicy();
      }
      reference.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          context.authorization
        );
    }

    return await this.contextRepository.save(context);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    contextID: string,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${contextID}`,
        LogContext.CONTEXT
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityMemberCreateAspect = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.CREATE_ASPECT],
      communityCredential.type,
      communityCredential.resourceID
    );
    communityMemberCreateAspect.inheritable = false;
    newRules.push(communityMemberCreateAspect);

    const communityMemberCreateCanvas = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.CREATE_CANVAS],
      communityCredential.type,
      communityCredential.resourceID
    );
    communityMemberCreateCanvas.inheritable = false;
    newRules.push(communityMemberCreateCanvas);

    // separate rule as do want the update to cascade so that users can update canvases
    const communityMemberUpdateCanvas = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.UPDATE_CANVAS],
      communityCredential.type,
      communityCredential.resourceID
    );
    newRules.push(communityMemberUpdateCanvas);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_CANVAS,
        AuthorizationPrivilege.CREATE_ASPECT,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
