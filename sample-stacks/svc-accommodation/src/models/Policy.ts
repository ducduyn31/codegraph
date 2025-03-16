import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Property from './Property';
import { PolicyAttributes } from '../types/accommodation';

// Define Policy model
class Policy extends Model<PolicyAttributes> implements PolicyAttributes {
  public id!: string;
  public propertyId!: string;
  public checkInTime!: string;
  public checkOutTime!: string;
  public cancellationPolicy!: string;
  public houseRules!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Policy.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'properties',
        key: 'id',
      },
    },
    checkInTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '14:00',
    },
    checkOutTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '11:00',
    },
    cancellationPolicy: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Standard 24-hour cancellation policy',
    },
    houseRules: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'policies',
  }
);

// Define associations
Policy.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Property.hasOne(Policy, { foreignKey: 'propertyId', as: 'policy' });

export default Policy;