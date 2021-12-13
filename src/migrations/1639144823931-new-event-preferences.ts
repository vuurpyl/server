import { MigrationInterface, QueryRunner } from 'typeorm';
import { RandomGenerator } from 'typeorm/util/RandomGenerator';

export class newEventPreferences1639144823931 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
        VALUES (UUID(), 1, 'Notification', '[Admin] Community Discussion Created', 'Receive notification when a new discussion is created for a community for which I am an administrator', 'boolean', 'NotificationCommunityDiscussionCreatedAdmin')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
        VALUES (UUID(), 1, 'Notification', '[Admin] Community Updates', 'Receive notification when a new update is shared with a community for which I am an administrator', 'boolean', 'NotificationCommunityUpdateSentAdmin')`
    );

    const users: any[] = await queryRunner.query(
      `SELECT u.id, u.displayName FROM user as u
      LEFT JOIN user_preference as up on up.userId = u.id
      LEFT JOIN user_preference_definition as upd
      ON upd.id = up.userPreferenceDefinitionId;`
    );

    const definitions: any[] = await queryRunner.query(
      `SELECT * FROM user_preference_definition as upd WHERE upd.type='NotificationCommunityUpdateSentAdmin' || upd.type='NotificationCommunityDiscussionCreatedAdmin';`
    );

    users.forEach(user =>
      definitions.forEach(async def => {
        const uuid = RandomGenerator.uuid4();
        console.log(def.displayName);
        console.log(user.displayName);
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${uuid}', NOW(), NOW(), 1, '', '', 0)`
        );
        await queryRunner.query(
          `INSERT INTO user_preference VALUES (UUID(), NOW(), NOW(), 1, 'false', '${uuid}', '${def.id}', '${user.id}')`
        );
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
