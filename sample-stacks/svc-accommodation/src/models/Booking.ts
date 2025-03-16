import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import Property from './Property';
import Room from './Room';
import { BookingStatus, BookingAttributes } from '../types/accommodation';

// Define Booking model
class Booking extends Model<BookingAttributes> implements BookingAttributes {
  public id!: string;
  public propertyId!: string;
  public roomId!: string;
  public userId!: string;
  public orderId!: string | null;
  public checkInDate!: Date;
  public checkOutDate!: Date;
  public guestCount!: number;
  public totalPrice!: number;
  public status!: BookingStatus;
  public specialRequests!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Booking.init(
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
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'rooms',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    guestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BookingStatus)),
      allowNull: false,
      defaultValue: BookingStatus.PENDING,
    },
    specialRequests: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    sequelize,
    tableName: 'bookings',
  }
);

// Define associations
Booking.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Property.hasMany(Booking, { foreignKey: 'propertyId', as: 'bookings' });

Booking.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(Booking, { foreignKey: 'roomId', as: 'bookings' });

export default Booking;