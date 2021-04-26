import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMatrixAuthProviderConfig } from '../../configuration/config/matrix';
import { IMatrixCryptographyService } from './cryptography.matrix.interface';
import * as crypto from 'crypto-js';
import { IMatrixUser } from '../user/user.matrix.interface';

@Injectable()
export class MatrixCryptographyService implements IMatrixCryptographyService {
  constructor(private configService: ConfigService) {}

  generateHmac(user: IMatrixUser, nonce: string, isAdmin?: boolean): string {
    const config = this.configService.get<IMatrixAuthProviderConfig>('matrix');

    if (!config || !config.sharedSecret) {
      throw new Error('Matrix configuration is not provided');
    }

    const mac = crypto.enc.Utf8.parse(config.sharedSecret);
    const hmac = crypto.algo.HMAC.create(crypto.algo.SHA1, mac);

    const toUft8 = (value: string) => crypto.enc.Utf8.parse(value);

    hmac.update(toUft8(nonce));
    hmac.update(toUft8('\x00'));
    hmac.update(toUft8(user.name));
    hmac.update(toUft8('\x00'));
    hmac.update(toUft8(user.password));
    hmac.update(toUft8('\x00'));
    hmac.update(isAdmin ? 'admin' : 'notadmin');

    return crypto.enc.Hex.stringify(hmac.finalize());
  }
}
