import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Room from './Room';
import { AvailabilityAttributes } from '../types/accommodation';

// Define Availability model
class Availability extends Model<AvailabilityAttributes> implements AvailabilityAttributes {
  public id!: string;
  public roomId!: string;
  public date!: Date;
  public available!: boolean;
  public price!: number;
  public inventory!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Availability.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'rooms',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    inventory: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'availabilities',
    indexes: [
      {
        unique: true,
        fields: ['roomId', 'date'],
      },
    ],
  }
);

// Define associations
Availability.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(Availability, { foreignKey: 'roomId', as: 'availabilities' });

export default Availability;