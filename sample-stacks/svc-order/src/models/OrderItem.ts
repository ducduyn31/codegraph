import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Order from './Order';
import { ItemType } from '../types/order';

// Define OrderItem model
class OrderItem extends Model {
  public id!: number;
  public orderId!: string;
  public type!: ItemType;
  public referenceId!: string;
  public name!: string;
  public description!: string;
  public quantity!: number;
  public price!: number;
  public details!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ItemType)),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'order_items',
  }
);

// Define associations
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });

export default OrderItem;