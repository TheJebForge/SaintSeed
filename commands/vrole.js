const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageButton, Permissions } = require('discord.js');
const { Constants } = require('discord.js');

const i18next = require('i18next');
const database = require('../models');

const { paginationEmbed } = require('../modules/helpers');



module.exports = {
	permissions: [ Permissions.FLAGS.ADMINISTRATOR ],
	categories: ["command_spam"],
	data: new SlashCommandBuilder()
		.setName('vrole')
		.setDescription('Voice role management')
		.addSubcommand(subcommand => subcommand
			.setName('register')
			.setDescription('Register a new or update existing voice role')
			.addRoleOption(option => option
				.setName('role')
				.setDescription('Select a role')
				.setRequired(true)
			).addNumberOption(option => option
				.setName('add-on-level')
				.setDescription('Add on level')
				.setRequired(true)
			).addNumberOption(option => option
				.setName('remove-on-level')
				.setDescription('Remove on level')
				.setRequired(false)
			),
		)
		.addSubcommand(subcommand => subcommand
			.setName('list')
			.setDescription('Get list of voice rooms')
		).
		addSubcommand(subcommand => subcommand
			.setName('remove')
			.setDescription('Removes a voice role')
			.addRoleOption(option => option
				.setName('role')
				.setDescription('Select a role')
				.setRequired(true)
			)
		),
	async execute(interaction) {
		const subCommand = interaction.options.getSubcommand();
		const guild = interaction.guild;

		if (subCommand == 'register') {
			const [ vRole, created ] = await database.VoiceRole.findOrCreate({
				where: {
					guild_id: interaction.guild.id,
					role_id: interaction.options.getRole('role').id,
				},
			});
			vRole.conditions = {};
			vRole.conditions.addOnLevel = interaction.options.getNumber("add-on-level");
			vRole.conditions.removeOnLevel = interaction.options.getNumber("remove-on-level");
			vRole.save();
			if (created) {
				interaction.reply(i18next.t('vRole.created'));
			} else {				
				interaction.reply(i18next.t('vRole.updated'));
			}
		}

		if (subCommand === 'remove') {
			await database.VoiceRole.destroy({
				where: {
					guild_id: interaction.guild.id,
					role_id: interaction.options.getRole('role').id,
				}
			});

			interaction.reply(i18next.t('vRole.deleted'));
		}

		if (subCommand === 'list') {
			const vRoles = await database.VoiceRole.findAll({
				where: {
					guild_id: interaction.guild.id,					
				},
			});

			let pageItemCount = 1;
			let pageInfo = "";
			let pages = [];

			vRoles.forEach((vRole, index) => {
				const role = guild.roles.cache.get(vRole.role_id);
				if (!role) return;

				pageInfo += `[**${index+1}**] ${role.name} | **+(${vRole.conditions?.addOnLevel})** **-(${vRole.conditions?.removeOnLevel ?? '⛔︎'})** \n`;
				pageItemCount++

				if (pageItemCount > 10 || index == vRoles.length-1) {
					const vRoleEmbed = new MessageEmbed()
						.setColor(process.env.EMBED_PRIMARY_COLOR)
						.setTitle(i18next.t('vRole.listTitle'))
						.setDescription(pageInfo);
					pages.push(vRoleEmbed);
					pageItemCount = 1;
					pageInfo = "";
				}

			});

			if (!pages.length) return interaction.reply(i18next.t('vRole.listEmpty'));

			paginationEmbed(interaction, pages);
		}
	},
};