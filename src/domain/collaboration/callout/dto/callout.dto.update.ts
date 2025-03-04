import { CalloutState } from '@common/enums/callout.state';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateCalloutCardTemplateInput } from './callout.dto.update.cardTemplate';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'Callout description.',
  })
  @IsOptional()
  description?: string;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state?: CalloutState;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => UpdateCalloutCardTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for this Card Callout.',
  })
  cardTemplate?: UpdateCalloutCardTemplateInput;
}
