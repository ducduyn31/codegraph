import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import { OrderStatus, PaymentStatus } from '../types/order';

// Define Order model
class Order extends Model {
  public id!: string;
  public userId!: string;
  public totalAmount!: number;
  public currency!: string;
  public status!: OrderStatus;
  public paymentStatus!: PaymentStatus;
  public paymentDetails!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OrderStatus)),
      allowNull: false,
      defaultValue: OrderStatus.PENDING,
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'orders',
  }
);

export default Order;