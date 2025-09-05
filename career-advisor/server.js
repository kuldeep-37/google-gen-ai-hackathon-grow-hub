import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "./uploads/" });

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("./service-account-key.json"), "utf-8")
);
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const db = getFirestore();

const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!process.env.GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY in environment");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Google Login - verify token and create/update user profile
app.post("/api/login", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    const locale = payload.locale || ""; // Handle undefined locale

    await db.collection("users").doc(email).set(
      {
        email,
        name: name || "",
        picture: picture || "",
        locale,
        points: 0,
        badges: [],
        skills: [],
        field: "",
        lastLogin: Date.now(),
        learningCoins: 0,
      },
      { merge: true }
    );

    res.json({ email, name, picture, locale, field: "", points: 0, badges: [], skills: [] });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(401).json({ error: "Invalid Google Login" });
  }
});

// Get user profile by email
app.get("/api/user", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const doc = await db.collection("users").doc(email).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json(doc.data());
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update onboarding info (name and field)
app.post("/api/onboarding", async (req, res) => {
  const { email, name, field } = req.body;
  if (!email || !name || !field)
    return res.status(400).json({ error: "Email, name, and field required" });
  try {
    await db.collection("users").doc(email).set({ name, field }, { merge: true });
    res.json({ message: "Profile updated" });
  } catch {
    res.status(500).json({ error: "Profile update failed" });
  }
});

// Upload certificate & update skills, points, badges
app.post("/api/upload-certificate", upload.single("file"), async (req, res) => {
  try {
    const { skill, email } = req.body;
    if (!email || !skill) return res.status(400).json({ error: "Email and skill required" });

    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const userData = userDoc.data();
    userData.skills = userData.skills || [];
    userData.badges = userData.badges || [];
    userData.points = userData.points || 0;

    const codeSkills = ["JavaScript", "Python", "Java", "C++", "React", "Node.js"];
    const pointsEarned = codeSkills.includes(skill) ? 10 : 5;

    if (!userData.skills.includes(skill)) userData.skills.push(skill);
    userData.points += pointsEarned;

    if (userData.points >= 100 && !userData.badges.includes("Gold")) userData.badges.push("Gold");
    else if (userData.points >= 50 && !userData.badges.includes("Silver")) userData.badges.push("Silver");
    else if (!userData.badges.includes("Bronze")) userData.badges.push("Bronze");

    await userRef.update(userData);

    res.json({ message: `Skill "${skill}" added. Points earned: ${pointsEarned}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Gemini AI Career Guidance Generation with markdown output
app.post("/api/career-advice", async (req, res) => {
  try {
    const { input, email, language = "en" } = req.body;
    if (!input) return res.status(400).json({ error: "Input required" });

    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const learningCoins = userData.learningCoins || 0;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
The student says: "${input}".
They have earned ${learningCoins} Skill Coins so far.
Preferred language: ${language}
Provide all responses in ${language}.
Sections:
1. **Personalized Career Roadmaps:** Suggest 3 unique career paths with required skills and market relevance.
2. **Skill Gap Radar:** Show mastered, emerging, and missing skills aligned to market demands.
3. **Gamified Learning:** Recommend 3 tasks/challenges to earn Skill Coins, badges, and leaderboard ranks.
4. **Future-Focused Guidance:** List 2 emerging jobs of the future and how to start preparing now.
5. **Multi-Language Support:** Mention guidance in multiple Indian languages.
6. **Dynamic AI Adaptation:** Advise how students can update skills/interests to always get fresh recommendations.
Add 2 short motivational tips. Use bullet points, bold section titles, and plain text. If relevant, add clickable resource URLs in markdown.
No JSON, only markdown text.
`;
    const result = await model.generateContent(prompt);
    const adviceText = result.response.text();

    await userRef.set(
      {
        learningCoins: learningCoins + 10,
        lastAdvice: Date.now(),
      },
      { merge: true }
    );

    res.json({ adviceText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate advice" });
  }
});

// Gemini AI Roadmap Generation with markdown output
app.post("/api/generate-roadmap", async (req, res) => {
  try {
    const { field } = req.body;
    if (!field) return res.status(400).json({ error: "Field is required" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
Create a detailed personalized roadmap for mastering skills in the field of ${field}.
Include milestones, learning steps, recommended free resources, and certifications.
Use bullet points, bold headings, and provide clickable markdown URLs if relevant.
No JSON, only markdown text.
`;
    const result = await model.generateContent(prompt);
    res.json({ roadmap: result.response.text() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate roadmap" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
