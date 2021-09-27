import { MigrationInterface, QueryRunner } from 'typeorm';

export class parentCommunity1632739026044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE community as co \
      INNER JOIN challenge as c ON c.communityId = co.id \
      INNER JOIN ecoverse as e ON e.id = c.ecoverseId \
      SET co.parentCommunityId = c.communityId where ISNULL(co.parentCommunityId);'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE community SET parentCommunityId = null where parentCommunityId IS NOT NULL;'
    );
  }
}
