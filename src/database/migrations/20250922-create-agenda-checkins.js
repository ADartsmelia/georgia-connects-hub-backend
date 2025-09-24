"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("agenda_checkins", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      day: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Day number (1, 2, etc.)",
      },
      itemIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Index of the agenda item",
      },
      isParallel: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Whether this is a parallel activity",
      },
      time: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Time slot of the agenda item",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Title of the agenda item",
      },
      checkedInAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: "When the user checked in",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex("agenda_checkins", {
      fields: ["userId", "day", "itemIndex", "isParallel"],
      unique: true,
      name: "unique_user_agenda_checkin",
    });

    await queryInterface.addIndex("agenda_checkins", {
      fields: ["day", "itemIndex", "isParallel"],
      name: "agenda_item_checkins",
    });

    await queryInterface.addIndex("agenda_checkins", {
      fields: ["userId"],
      name: "agenda_checkins_user_id",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("agenda_checkins");
  },
};
