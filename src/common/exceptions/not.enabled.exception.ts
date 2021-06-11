import { LogContext } from '@common/enums';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';
import { BaseException } from './base.exception';

export class NotSupportedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.NOT_SUPPORTED);
  }
}
