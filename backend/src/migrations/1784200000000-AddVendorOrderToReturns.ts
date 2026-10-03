import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddVendorOrderToReturns1784200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('returns', [
      new TableColumn({
        name: 'vendorOrderId',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'vendorId',
        type: 'integer',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKeys('returns', [
      new TableForeignKey({
        columnNames: ['vendorOrderId'],
        referencedTableName: 'vendor_orders',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['vendorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('returns', [
      new TableIndex({
        name: 'IDX_returns_vendorOrderId',
        columnNames: ['vendorOrderId'],
      }),
      new TableIndex({
        name: 'IDX_returns_vendorId',
        columnNames: ['vendorId'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('returns', 'IDX_returns_vendorId');
    await queryRunner.dropIndex('returns', 'IDX_returns_vendorOrderId');
    await queryRunner.dropColumn('returns', 'vendorId');
    await queryRunner.dropColumn('returns', 'vendorOrderId');
  }
}
