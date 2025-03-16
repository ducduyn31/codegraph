import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import { ImageAttributes } from '../types/accommodation';

// Define Image model
class Image extends Model<ImageAttributes> implements ImageAttributes {
  public id!: string;
  public referenceId!: string;
  public referenceType!: string;
  public url!: string;
  public caption!: string;
  public isPrimary!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Image.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['property', 'room']],
      },
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    caption: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'images',
    indexes: [
      {
        fields: ['referenceId', 'referenceType'],
      },
    ],
  }
);

export default Image;