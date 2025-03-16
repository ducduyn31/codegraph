import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Property from './Property';
import { ReviewAttributes } from '../types/accommodation';

// Define Review model
class Review extends Model<ReviewAttributes> implements ReviewAttributes {
  public id!: string;
  public propertyId!: string;
  public userId!: string;
  public rating!: number;
  public comment!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Review.init(
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
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'reviews',
  }
);

// Define associations
Review.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Property.hasMany(Review, { foreignKey: 'propertyId', as: 'reviews' });

export default Review;