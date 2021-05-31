import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { CreateTagsetInput } from '@domain/common/tagset';
import { MID_TEXT_LENGTH, LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';

@InputType()
export class CreateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [CreateTagsetInput], { nullable: true })
  @IsOptional()
  tagsetsData?: CreateTagsetInput[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  @IsOptional()
  referencesData?: CreateReferenceInput[];
}
