import { InputType, Field } from '@nestjs/graphql';
import {
  SMALL_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateCanvasInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value?: string;
}
