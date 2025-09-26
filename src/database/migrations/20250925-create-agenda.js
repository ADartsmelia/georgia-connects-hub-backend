import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("agenda", {
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether this agenda item is currently active",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes
  await queryInterface.addIndex("agenda", ["day", "itemIndex", "isParallel"], {
    unique: true,
    name: "unique_agenda_item",
  });

  await queryInterface.addIndex("agenda", ["day"], {
    name: "agenda_by_day",
  });

  await queryInterface.addIndex("agenda", ["isActive"], {
    name: "agenda_active",
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable("agenda");
};
