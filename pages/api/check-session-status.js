import Stripe from "stripe";
import clientPromise from "../../lib/mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Método no permitido" });
	}

	const { session_id } = req.body;

	if (!session_id) {
		return res.status(400).json({ error: "session_id es requerido" });
	}

	try {
		console.log("🔎 Consultando sesión:", session_id);

		// Obtenemos la sesión de Stripe
		const session = await stripe.checkout.sessions.retrieve(session_id);
		const sessionId = session.id;

		const auth0Id = session.metadata?.auth0Id;
		if (!auth0Id || !sessionId) {
			console.warn("⚠️ auth0Id o session_id faltante");
			return res.status(400).json({ error: "Faltan datos" });
		}

		if (!session.payment_intent) {
			console.warn("⚠️ La sesión no tiene payment_intent");
			return res.status(400).json({ status: "incomplete" });
		}

		// Obtenemos el estado del paymentIntent
		const paymentIntent = await stripe.paymentIntents.retrieve(
			session.payment_intent
		);

		if (paymentIntent.status === "succeeded") {
			const auth0Id = session.metadata?.auth0Id;

			if (!auth0Id) {
				console.warn("⚠️ auth0Id no presente en metadata");
				return res.status(400).json({ error: "auth0Id ausente" });
			}

			// Actualizamos la base de datos como fallback si es necesario
			const client = await clientPromise;
			const db = client.db("BlogStandard");

			//verificamos si ya fue procesado ****
			const user = await db.collection("users").findOne({ auth0Id });

			const yaProcesada = user?.processedStripeSessions?.some(
				(s) => s.id === sessionId
			);

			if (yaProcesada) {
				console.log(
					"⛔ Sesión ya procesada previamente (fallback):",
					sessionId
				);
				return res.status(200).json({ status: "already-processed" });
			}
			//****/
			// Confirmamos que el pago fue exitoso
			const paymentIntent = await stripe.paymentIntents.retrieve(
				session.payment_intent
			);

			if (paymentIntent.status === "succeeded") {
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

				console.log(
					"✅ Tokens actualizados (fallback) para",
					auth0Id,
					"| Sesión:",
					sessionId
				);
				return res
					.status(200)
					.json({ status: "completed", tokensUpdated: true });
			}
		} else {
			console.log("❌ Pago no completado:", paymentIntent.status);
			return res.status(200).json({ status: paymentIntent.status });
		}
	} catch (err) {
		console.error("❌ Error al verificar sesión:", err);
		return res.status(500).json({ error: "Error al verificar sesión de pago" });
	}
}
