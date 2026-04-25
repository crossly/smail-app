type PersistIncomingEmailOptions = {
	id: string;
	raw: ArrayBuffer;
	toAddress: string;
	fromName: string | null | undefined;
	fromAddress: string | null | undefined;
	subject: string | null | undefined;
	time: number;
};

export async function persistIncomingEmail(
	env: Pick<Env, "D1" | "R2">,
	options: PersistIncomingEmailOptions,
) {
	const {
		id,
		raw,
		toAddress,
		fromName,
		fromAddress,
		subject,
		time,
	} = options;

	await env.R2.put(id, raw);

	try {
		await env.D1.prepare(
			"INSERT INTO emails (id, to_address, from_name, from_address, subject, time) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(id, toAddress, fromName, fromAddress, subject, time)
			.run();
	} catch (error) {
		await env.R2.delete(id);
		throw error;
	}
}
