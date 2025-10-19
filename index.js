import { DateTime } from "luxon";
import { scheduleJob } from "node-schedule";
import games from "./games.json" with { type: "json" };

const webhookUrl = process.env.WEBHOOK_URL;
if (!webhookUrl) throw new Error("WEBHOOK_URL not available from env");

const mentions = process.env.MENTION_ROLES?.split(",");

for (const game of games) {
	const start = DateTime.fromISO(game.start);
	if (!start.isValid) {
		throw new Error(`invalid date ${game.start}`);
	}

	const seconds = Math.round(start.toSeconds());
	const dayBefore = start.minus({ days: 1 });
	const name = game.name ?? `${game.away} & ${game.home}`;

	const trailingComponents = [];

	if (game.note) {
		trailingComponents.push({
			type: 10,
			content: game.note,
		});
	}

	if (mentions) {
		trailingComponents.push(
			{
				type: 14,
				divider: true,
				spacing: 1,
			},
			{
				type: 10,
				content: mentions.map((id) => `<@&${id}>`).join(" "),
			},
		);
	}

	async function notify() {
		const res = await fetch(`${webhookUrl}?with_components=true`, {
			method: "POST",
			body: JSON.stringify({
				flags: 32768,
				components: [
					{
						type: 17,
						components: [
							{
								type: 10,
								content: `# ${getEmoji(game.sport)} ${name} <t:${seconds}:R>
Start: <t:${seconds}:f>
Home: ${game.home}
Away: ${game.away}
Broadcast: ${game.broadcast}`,
							},
							...trailingComponents,
						],
					},
				],
			}),
			headers: {
				"content-type": "application/json",
			},
		});

		if (!res.ok) throw new Error(`response not ok: ${await res.text()}`);
	}

	console.log(`scheduling jobs at ${dayBefore} and ${start}`);
	scheduleJob(dayBefore.toJSDate(), notify);
	scheduleJob(start.toJSDate(), notify);
}

function getEmoji(sport) {
	switch (sport) {
		case "baseball":
			return "⚾";
		case "football":
			return "🏈";
		default:
			return "";
	}
}
