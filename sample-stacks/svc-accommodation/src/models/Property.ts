import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import { PropertyType, PropertyAttributes } from '../types/accommodation';

// Define Property model
class Property extends Model<PropertyAttributes> implements PropertyAttributes {
  public id!: string;
  public name!: string;
  public description!: string;
  public type!: PropertyType;
  public address!: string;
  public city!: string;
  public state!: string;
  public country!: string;
  public postalCode!: string;
  public latitude!: number;
  public longitude!: number;
  public amenities!: string[];
  public rating!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Property.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(PropertyType)),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'properties',
  }
);

export default Property;