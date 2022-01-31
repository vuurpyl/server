import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { CreateTagsetInput } from '@domain/common/tagset';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';

@InputType()
export class CreateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [CreateTagsetInput], { nullable: true })
  tagsetsData?: CreateTagsetInput[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  referencesData?: CreateReferenceInput[];
}
