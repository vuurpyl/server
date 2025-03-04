import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifecycleTemplate } from './lifecycle.template.entity';
import { ILifecycleTemplate } from './lifecycle.template.interface';
import { TemplateInfoAuthorizationService } from '../template-info/template.info.service.authorization';

@Injectable()
export class LifecycleTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(LifecycleTemplate)
    private lifecycleTemplateRepository: Repository<LifecycleTemplate>,
    private templateInfoAuthorizationService: TemplateInfoAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    lifecycleTemplate: ILifecycleTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILifecycleTemplate> {
    // Inherit from the parent
    lifecycleTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        lifecycleTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    if (lifecycleTemplate.templateInfo) {
      lifecycleTemplate.templateInfo =
        await this.templateInfoAuthorizationService.applyAuthorizationPolicy(
          lifecycleTemplate.templateInfo,
          lifecycleTemplate.authorization
        );
    }

    return await this.lifecycleTemplateRepository.save(lifecycleTemplate);
  }
}
