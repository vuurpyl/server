import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { UserInfo } from './user-info';

@Injectable()
export class AuthenticationService {
  constructor(private readonly userService: UserService) {}

  async createUserInfo(email: string): Promise<UserInfo> {
    const knownUser = await this.userService.getUserWithGroups(email);
    return { email, user: knownUser };
  }
}
