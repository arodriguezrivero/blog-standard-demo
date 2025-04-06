import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import { AppLayout } from "../components/AppLayout";
import { getAppProps } from "../utils/getAppProps";
import { useRouter } from "next/router";
import { useEffect, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function TokenTopup() {
	const router = useRouter();
	//const { success, canceled } = router.query;

	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState({});

	useEffect(() => {
		const { success, canceled, session_id } = router.query;

		if ((success || canceled) && session_id) {
			setShowModal(true);
			setModalContent(
				success
					? {
							title: "✅ Pago exitoso",
							message: "¡Tus tokens han sido añadidos correctamente! 🎉",
							color: "green",
					  }
					: {
							title: "❌ Pago cancelado",
							message:
								"El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.",
							color: "red",
					  }
			);

			//validación adicional
			if (success && session_id) {
				(async () => {
					const res = await fetch("/api/check-session-status", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ session_id }),
					});
					const data = await res.json();

					console.log("🧾 Verificación de sesión:", data);

					if (data.status === "completed") {
						setShowModal(true);
						setModalContent({
							title: "✅ Pago verificado manualmente",
							message: "¡Tus tokens han sido añadidos correctamente! 🎉",
							color: "green",
						});
					}
				})();
			}

			// 🧼 Después de 4 segundos, cerrar el modal y limpiar la URL
			const timer = setTimeout(() => {
				setShowModal(false);
				router.replace("/token-topup", undefined, { shallow: true });
			}, 4000);

			// 🧹 Limpiar el timeout si el componente se desmonta
			return () => clearTimeout(timer);
		}
	}, [router]);

	const handleClick = async () => {
		const result = await fetch(`/api/addTokens`, {
			method: "POST",
		});
		const json = await result.json();
		window.location.href = json.session.url;
	};

	return (
		<>
			<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
				<div className="max-w-xl mx-auto">
					<div className="bg-white p-8 rounded-xl shadow-lg text-center">
						<h1 className="text-2xl font-bold mb-4">Recargar Tokens</h1>
						<p className="text-gray-600 mb-6">
							Compra paquetes de tokens para usar en la plataforma.
						</p>
						<button onClick={handleClick} className="btn">
							Añadir Tokens
						</button>
					</div>
				</div>
			</div>

			{/* Modal */}
			<Transition appear show={showModal} as={Fragment}>
				<Dialog
					as="div"
					className="relative z-50"
					onClose={() => setShowModal(false)}
				>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center px-4">
							<Dialog.Panel className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
								<Dialog.Title
									className={`text-lg font-bold text-${modalContent.color}-600 mb-2`}
								>
									{modalContent.title}
								</Dialog.Title>
								<Dialog.Description className="text-gray-700">
									{modalContent.message}
								</Dialog.Description>

								<div className="mt-4 text-right">
									<button
										className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
										onClick={() => {
											setShowModal(false);
											router.replace("/token-topup", undefined, {
												shallow: true,
											}); // elimina query
										}}
									>
										Cerrar
									</button>
								</div>
							</Dialog.Panel>
						</div>
					</Transition.Child>
				</Dialog>
			</Transition>
		</>
	);
}

TokenTopup.getLayout = function getLayout(page, pageProps) {
	return <AppLayout {...pageProps}>{page}</AppLayout>;
};

export const getServerSideProps = withPageAuthRequired({
	async getServerSideProps(ctx) {
		const props = await getAppProps(ctx);
		return {
			props,
		};
	},
});
