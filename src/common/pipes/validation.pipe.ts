/* eslint-disable @typescript-eslint/ban-types */
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Handler } from '../../core/validation/handlers/base/handler.interface';
import { BaseHandler } from '../../core/validation/handlers/base/base.handler';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return await value;
    }
    const object = await plainToClass(metatype, value);
    // const opportunityHandler = new OpportunityHandler();
    // const actorHandler = new ActorHandler();
    const baseHandler = new BaseHandler();
    // opportunityHandler.setNext(actorHandler).setNext(baseHandler);
    await this.validate(baseHandler, object, metatype);

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private async validate(handler: Handler, value: any, metatype: Function) {
    await handler.handle(value, metatype);
  }
}
