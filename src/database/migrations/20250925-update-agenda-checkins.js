"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing table and recreate it with the new schema
    await queryInterface.dropTable("agenda_checkins");

    await queryInterface.createTable("agenda_checkins", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      agendaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "agenda",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      checkedInAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex("agenda_checkins", {
      fields: ["userId", "agendaId"],
      unique: true,
      name: "unique_user_agenda_checkin",
    });

    await queryInterface.addIndex("agenda_checkins", {
      fields: ["agendaId"],
      name: "agenda_item_checkins",
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the table
    await queryInterface.dropTable("agenda_checkins");

    // Recreate the old table structure
    await queryInterface.createTable("agenda_checkins", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      },
      itemIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      isParallel: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      time: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      checkedInAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add old indexes
    await queryInterface.addIndex("agenda_checkins", {
      fields: ["userId", "day", "itemIndex", "isParallel"],
      unique: true,
      name: "unique_user_agenda_checkin",
    });

    await queryInterface.addIndex("agenda_checkins", {
      fields: ["day", "itemIndex", "isParallel"],
      name: "agenda_item_checkins",
    });
  },
};
