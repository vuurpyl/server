import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-http-bearer';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { IOidcConfig } from '@interfaces/oidc.config.interface';
import { AuthService } from './auth.service';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'bearer') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      ...configService.get<IOidcConfig>('oidc'),
    });
  }

  async validate(
    _req: Request,
    encodedToken: string,
    done: CallableFunction
  ): Promise<any> {
    try {
      const [knownUser, token] = await this.authService.getUserFromToken(
        encodedToken
      );

      return done(null, knownUser, token);
    } catch (error) {
      done(
        new AuthenticationException(
          `Failed adding the user to the request object: ${error}`
        )
      );
    }
  }
}
export const AzureADGuard = AuthGuard('bearer');
