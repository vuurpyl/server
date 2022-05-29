import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('AspectTemplate2')
export abstract class IAspectTemplate extends ITemplateBase {
  @Field(() => String, {
    nullable: false,
    description: 'The type for this Aspect.',
  })
  type!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The default description to show to users filling our a new instance.',
  })
  defaultDescription!: string;
}
