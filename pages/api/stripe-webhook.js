import Stripe from "stripe";
import clientPromise from "../../lib/mongodb";

export const config = {
	api: {
		bodyParser: false,
	},
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🧼 Utilidad para leer el raw body del request
import { Readable } from "stream";

async function buffer(readable) {
	const chunks = [];
	for await (const chunk of readable) {
		chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
	}
	return Buffer.concat(chunks);
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		console.warn("🚫 Método no permitido en webhook");
		return res.status(405).end("Método no permitido");
	}

	const rawBody = await buffer(req);
	const sig = req.headers["stripe-signature"];
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event;

	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
		console.log("✅ Firma verificada. Evento recibido:", event.type);
	} catch (err) {
		console.error("❌ Error verificando firma:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Manejar el evento de sesión completada
	if (event.type === "checkout.session.completed") {
		const session = event.data.object;
		console.log("🎟️ Sesión completada:", session.id);

		const auth0Id = session.metadata?.auth0Id;
		const sessionId = session.id;

		if (!auth0Id) {
			console.warn(
				"⚠️ auth0Id no presente en metadata. No se puede actualizar tokens."
			);
			return res.status(400).end();
		}

		if (!auth0Id || !sessionId) {
			console.warn("⚠️ Faltan datos en la sesión");
			return res.status(400).end();
		}

		console.log(`🔍 Buscando usuario con auth0Id: ${auth0Id}`);
		const client = await clientPromise;
		const db = client.db("BlogStandard");

		const existingUser = await db.collection("users").findOne({ auth0Id });

		const yaProcesada = existingUser?.processedStripeSessions?.some(
			(s) => s.id === sessionId
		);

		if (yaProcesada) {
			console.log("⛔ Sesión ya procesada previamente:", sessionId);
			return res.status(200).json({ alreadyProcessed: true });
		}

		const result = await db.collection("users").updateOne(
			{ auth0Id },
			{
				$inc: { availableTokens: 10 },
				$addToSet: {
					processedStripeSessions: {
						id: sessionId,
						processedAt: new Date(),
					},
				},
				$setOnInsert: { auth0Id },
			},
			{ upsert: true }
		);

		console.log("✅ Tokens actualizados para", auth0Id, "Resultado:", result);
	} else {
		console.log(`ℹ️ Evento no manejado: ${event.type}`);
	}

	res.status(200).json({ received: true });
}
