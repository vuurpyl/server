import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class location1651384201504 implements MigrationInterface {
  name = 'location1651384201504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`location\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`city\` varchar(255) NOT NULL,  \`country\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    // Add location to profiles
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`locationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    const profiles: any[] = await queryRunner.query(`SELECT id from profile`);
    for (const profile of profiles) {
      console.log(`Retrieved profile with id: ${profile.id}`);
      const locationID = randomUUID();
      await queryRunner.query(
        `INSERT INTO location (id, version, city, country)
            values ('${locationID}', 1,  '', '')`
      );
      await queryRunner.query(
        `update profile set locationId = '${locationID}' WHERE (id = '${profile.id}')`
      );
    }

    // Copy over the user city / country fields
    const userProfiles: any[] = await queryRunner.query(
      `SELECT id, profileId, city, country FROM user`
    );
    for (const userProfile of userProfiles) {
      console.log(`Updating user with profile id: ${userProfile.profileId}`);
      const profiles: any[] = await queryRunner.query(
        `SELECT id, locationId FROM profile  WHERE (id = '${userProfile.profileId}')`
      );
      if (profiles.length === 1) {
        const profile = profiles[0];
        await queryRunner.query(
          `update location set city = '${userProfile.city}' WHERE (id = '${profile.locationId}')`
        );
        await queryRunner.query(
          `update location set country = '${userProfile.country}' WHERE (id = '${profile.locationId}')`
        );
      }
    }
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`city\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`country\``);

    // Add location to context
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`locationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_88888ca8ac212b8357637794d6\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_88888ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    const contexts: any[] = await queryRunner.query(`SELECT id from context`);
    for (const context of contexts) {
      console.log(`Retrieved context with id: ${context.id}`);
      const locationID = randomUUID();
      await queryRunner.query(
        `INSERT INTO location (id, version, city, country)
                values ('${locationID}', 1,  '', '')`
      );
      await queryRunner.query(
        `update context set locationId = '${locationID}' WHERE (id = '${context.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // todo: add back in city, country fields to users + populate

    await queryRunner.query('DROP TABLE `location`');

    // todo: remove the location field and constraints
  }
}
