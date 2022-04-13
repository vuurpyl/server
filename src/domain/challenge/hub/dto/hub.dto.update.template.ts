import { InputType, Field } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { UpdateAspectTemplateInput } from './hub.dto.update.template.aspect';

@InputType()
export class UpdateHubTemplateInput {
  @Field(() => [UpdateAspectTemplateInput], {
    nullable: false,
    description:
      'The set of aspect type definitions to be supported by the Hub.',
  })
  @ValidateNested()
  aspectTemplates!: UpdateAspectTemplateInput[];
}
