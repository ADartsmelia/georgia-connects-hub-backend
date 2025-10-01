import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Agenda = sequelize.define(
  "Agenda",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Day identifier (e.g., 'Day 1', 'Day 2')",
    },
    itemIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Index of the agenda item within the day",
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
    requiresCheckIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this item requires check-in",
    },
    checkInLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Maximum number of check-ins allowed (null = unlimited)",
      validate: {
        min: 0,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether this agenda item is currently active",
    },
  },
  {
    tableName: "agenda",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["day", "itemIndex", "isParallel"],
        name: "unique_agenda_item",
      },
      {
        fields: ["day"],
        name: "agenda_by_day",
      },
      {
        fields: ["isActive"],
        name: "agenda_active",
      },
    ],
  }
);

export default Agenda;
