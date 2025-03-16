import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Property from './Property';
import { RoomAttributes } from '../types/accommodation';

// Define Room model
class Room extends Model<RoomAttributes> implements RoomAttributes {
  public id!: string;
  public propertyId!: string;
  public name!: string;
  public description!: string;
  public capacity!: number;
  public bedConfiguration!: string;
  public amenities!: string[];
  public basePrice!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Room.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bedConfiguration: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    basePrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'rooms',
  }
);

// Define associations
Room.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Property.hasMany(Room, { foreignKey: 'propertyId', as: 'rooms' });

export default Room;