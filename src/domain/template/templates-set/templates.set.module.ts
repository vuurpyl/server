import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspectTemplate } from '../aspect-template/aspect.template.entity';
import { AspectTemplateModule } from '../aspect-template/aspect.template.module';
import { CanvasTemplate } from '../canvas-template/canvas.template.entity';
import { CanvasTemplateModule } from '../canvas-template/canvas.template.module';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { TemplatesSet } from './templates.set.entity';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectTemplateModule,
    CanvasTemplateModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([TemplatesSet]),
    TypeOrmModule.forFeature([AspectTemplate]),
    TypeOrmModule.forFeature([CanvasTemplate]),
  ],
  providers: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
  exports: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
})
export class TemplatesSetModule {}
