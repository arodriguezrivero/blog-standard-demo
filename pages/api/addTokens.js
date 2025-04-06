import { getSession } from "@auth0/nextjs-auth0";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).end("Método no permitido");
	}

	const session = await getSession(req, res);
	if (!session || !session.user) {
		return res.status(401).json({ error: "Usuario no autenticado" });
	}

	const { user } = session;

	const protocol =
		process.env.NODE_ENV === "development" ? "http://" : "https://";
	const host = req.headers.host;

	try {
		const checkoutSession = await stripe.checkout.sessions.create({
			mode: "payment",
			line_items: [
				{
					price: process.env.STRIPE_PRODUCT_PRICE_ID,
					quantity: 1,
				},
			],
			payment_intent_data: {
				metadata: {
					auth0Id: user.sub,
				},
			},
			metadata: {
				auth0Id: user.sub,
			},
			success_url: `${protocol}${host}/token-topup?success=1&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${protocol}${host}/token-topup?canceled=1`,
		});

		res.status(200).json({ session: checkoutSession });
	} catch (err) {
		console.error("❌ Error al crear sesión:", err);
		res.status(500).json({ error: "Error al crear la sesión de pago" });
	}
}
