import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const AgendaCheckIn = sequelize.define(
  "AgendaCheckIn",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Day number (1, 2, etc.)",
    },
    itemIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Index of the agenda item",
    },
    isParallel: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this is a parallel activity",
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Time slot of the agenda item",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Title of the agenda item",
    },
    checkedInAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "When the user checked in",
    },
  },
  {
    tableName: "agenda_checkins",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "day", "itemIndex", "isParallel"],
        name: "unique_user_agenda_checkin",
      },
      {
        fields: ["day", "itemIndex", "isParallel"],
        name: "agenda_item_checkins",
      },
    ],
  }
);

export default AgendaCheckIn;
