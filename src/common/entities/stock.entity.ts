import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  productId: string;

  @Column('int', { default: 0 })
  quantity: number;

  @Column('int', { default: 0 })
  reservedQuantity: number;

  @UpdateDateColumn()
  lastUpdated: Date;

  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
} 