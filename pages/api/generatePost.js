import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { OpenAIApi, Configuration } from "openai";
import clientPromise from "../../lib/mongodb";

export default withApiAuthRequired(async function handler(req, res) {
	const { user } = await getSession(req, res);
	const client = await clientPromise;
	const db = client.db("BlogStandard");

	const userProfile = await db.collection("users").findOne({
		auth0Id: user.sub,
	});

	if (!userProfile?.availableTokens) {
		res.status(403);
		return;
	}

	const config = new Configuration({
		apiKey: process.env.OPENAI_API_KEY,
	});

	const openai = new OpenAIApi(config);

	const { topic, keywords } = req.body;

	if (!topic || !keywords) {
		res.status(422);
		return;
	}

	if (topic.length > 80 || keywords.length > 80) {
		res.status(422);
		return;
	}

	const response = await openai.createChatCompletion({
		model: "gpt-4o",
		messages: [
			{
				role: "system",
				content:
					"You are an SEO friendly blog post generator called BlogStandard. Tou are designated to output markdown whithout frontmatter.",
			},
			{
				role: "user",
				content: `
                Generate me a long and detailed SEO friendly blog post on the following topic delimited by triple hyphens: 
                ---
                ${topic}
                ---
                Targeting the following comma separated keywords delimited by triple hyphens:
                ---
                ${keywords}
                ---
                `,
			},
		],
	});

	const postContent = response.data.choices[0]?.message?.content;

	const seoResponse = await openai.createChatCompletion({
		model: "gpt-4o",
		messages: [
			{
				role: "system",
				content:
					"You are an SEO friendly blog post generator called BlogStandard. Tou are designated to output JSON. Do not include HTML tags in your output.",
			},
			{
				role: "user",
				content: `
                Generate an SEO friendly title and SEO friendly meta description for the following blog post.                
                ${postContent}
				---
				The output json must be in the following format:    
				{
					"title": "example title",
					"metaDescription": "example meta description"
				}           
                `,
			},
		],
		response_format: { type: "json_object" },
	});

	let title = null;
	let metaDescription = null;

	try {
		const seoData = JSON.parse(
			seoResponse.data.choices[0]?.message?.content || "{}"
		);
		title = seoData.title;
		metaDescription = seoData.metaDescription;
	} catch (err) {
		console.error("Error al parsear JSON de OpenAI:", err);
	}

	/*const { title, metaDescription } =
		seoResponse.data.choices[0]?.message?.content || {};

	console.log("SEO Response: ", seoResponse.data.choices[0]?.message?.content);*/

	await db.collection("users").updateOne(
		{
			auth0Id: user.sub,
		},
		{
			$inc: {
				availableTokens: -1,
			},
		}
	);

	const post = await db.collection("posts").insertOne({
		postContent,
		title,
		metaDescription,
		topic,
		keywords,
		userId: userProfile._id,
		created: new Date(),
	});

	console.log("POST: ", post);

	res.status(200).json({
		postId: post.insertedId,
	});
});
