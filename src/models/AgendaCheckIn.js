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
    agendaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "agenda",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Reference to the agenda item",
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
        fields: ["userId", "agendaId"],
        name: "unique_user_agenda_checkin",
      },
      {
        fields: ["agendaId"],
        name: "agenda_item_checkins",
      },
    ],
  }
);

export default AgendaCheckIn;
