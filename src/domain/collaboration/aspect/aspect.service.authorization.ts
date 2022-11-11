import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { IAspect } from './aspect.interface';
import { Aspect } from './aspect.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AspectService } from './aspect.service';
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CardProfileAuthorizationService } from '../card-profile/card.profile.service.authorization';

@Injectable()
export class AspectAuthorizationService {
  constructor(
    private aspectService: AspectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    private cardProfileAuthorizationService: CardProfileAuthorizationService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>
  ) {}

  async applyAuthorizationPolicy(
    aspect: IAspect,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAspect> {
    aspect.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aspect.authorization,
        parentAuthorization
      );
    aspect.authorization = this.appendPrivilegeRules(aspect.authorization);

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (aspect.comments) {
      aspect.comments =
        await this.commentsAuthorizationService.applyAuthorizationPolicy(
          aspect.comments,
          aspect.authorization
        );
    }

    // Extend to give the user creating the aspect more rights
    aspect.authorization = this.appendCredentialRules(aspect);

    // cascade
    if (aspect.banner) {
      aspect.banner.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          aspect.banner.authorization,
          aspect.authorization
        );
    }
    if (aspect.bannerNarrow) {
      aspect.bannerNarrow.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          aspect.bannerNarrow.authorization,
          aspect.authorization
        );
    }

    aspect.profile = await this.aspectService.getCardProfile(aspect);
    aspect.profile =
      await this.cardProfileAuthorizationService.applyAuthorizationPolicy(
        aspect.profile,
        aspect.authorization
      );

    return await this.aspectRepository.save(aspect);
  }

  private appendCredentialRules(aspect: IAspect): IAuthorizationPolicy {
    const authorization = aspect.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Aspect: ${aspect.id}`,
        LogContext.COLLABORATION
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const manageCreatedAspectPolicy = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.USER_SELF_MANAGEMENT,
      aspect.createdBy
    );
    newRules.push(manageCreatedAspectPolicy);

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

    const communityJoinPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_COMMENT],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(communityJoinPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
