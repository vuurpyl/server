import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { TestDataService } from '@utils/data-management/test-data.service';
import { TokenHelper } from './token.helper';

export class appSingleton {
  private static _instance: appSingleton;
  private static testDataService: TestDataService;

  private _app!: INestApplication;
  public get app(): INestApplication {
    return this._app;
  }
  public set app(value: INestApplication) {
    this._app = value;
  }

  private _userTokenMap!: Map<string, string>;
  public get userTokenMap(): Map<string, string> {
    return this._userTokenMap;
  }
  public set userTokenMap(value: Map<string, string>) {
    this._userTokenMap = value;
  }

  private constructor() {
    //...
  }

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }

  async initServer() {
    const testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = testModule.createNestApplication();
    await this.app.init();
    appSingleton.testDataService = await testModule.get(TestDataService);
    const configService = await testModule.get(ConfigService);
    await this.getTokensForAllTestUsers(configService);

    await appSingleton.testDataService.initDB();
    await appSingleton.testDataService.initFunctions();
  }

  async teardownServer() {
    //await appSingleton.testDataService.teardownFunctions();
    await appSingleton.testDataService.teardownDB();
    await this.app.close();
  }

  private async getTokensForAllTestUsers(configService: ConfigService) {
    const tokenHelper = new TokenHelper(configService);
    this.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
