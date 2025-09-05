// App.js
import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { marked } from "marked";

const API_BASE = "http://localhost:5000";

function getTierBadge(points) {
  if (points >= 100) return { label: "Gold", color: "#FFD700", icon: "🥇" };
  if (points >= 50) return { label: "Silver", color: "#C0C0C0", icon: "🥈" };
  return { label: "Bronze", color: "#CD7F32", icon: "🥉" };
}

function NavMenuGrid({ onSelect, onLogout }) {
  return (
    <div className="nav-menu-grid">
      <button onClick={() => onSelect("main")}>Career Guidance</button>
      <button onClick={() => onSelect("certificate")}>Add Certificate</button>
      <button onClick={() => onSelect("profile")}>Profile Holder</button>
      <button onClick={() => onSelect("roadmap")}>Roadmap Generator</button>
      <button className="logout-btn" onClick={onLogout}>Logout</button>
    </div>
  );
}

function Dashboard({ user, onNavigate }) {
  return (
    <div className="card dashboard-center">
      <h2>Welcome, {user?.name || "Guest"}!</h2>
      <p>Start planning your career with personalized guidance and resources.</p>
      <NavMenuGrid onSelect={onNavigate} onLogout={() => onNavigate("logout")} />
    </div>
  );
}

function Onboarding({ userProfile, onComplete }) {
  const [name, setName] = useState(userProfile.name || "");
  const [field, setField] = useState("");
  const careerFields = [
    "AI / Machine Learning",
    "Cloud Security",
    "Data Science / Marketing",
    "Product Management",
    "Software Development",
  ];
  const submit = () => {
    if (name && field) onComplete({ name, field });
  };
  return (
    <div className="card onboarding-card dashboard-center">
      <h2>Complete Your Profile</h2>
      {!name && (
        <>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </>
      )}
      <label>Career Field</label>
      <select value={field} onChange={(e) => setField(e.target.value)}>
        <option value="">Select a career field</option>
        {careerFields.map((cf) => (
          <option key={cf} value={cf}>
            {cf}
          </option>
        ))}
      </select>
      <button disabled={!name || !field} onClick={submit} className="main-btn">
        Continue
      </button>
    </div>
  );
}

function Login({ onLogin }) {
  return (
    <div className="card login-card dashboard-center">
      <h2>Welcome to Career Advisor</h2>
      <p>Please login with Google to continue</p>
      <GoogleLogin onSuccess={(res) => onLogin(res.credential)} onError={() => alert("Login Failed")} />
    </div>
  );
}

function CareerGuidance({ guidance, onBack }) {
  return (
    <div className="card guidance-card dashboard-center">
      <h2>Career Guidance</h2>
      <div className="guidance-output" dangerouslySetInnerHTML={{ __html: marked.parse(guidance) }} />
      <button onClick={onBack} className="main-btn">
        Back to Dashboard
      </button>
    </div>
  );
}

function CertificateUpload({ user, onBack, onRefresh }) {
  const [file, setFile] = useState(null);
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!file || !skill) return alert("Please select file and enter a skill");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skill", skill);
    formData.append("email", user.email);
    try {
      const res = await fetch(`${API_BASE}/api/upload-certificate`, { method: "POST", body: formData });
      const data = await res.json();
      alert(data.message);
      onRefresh();
      onBack();
    } catch {
      alert("Upload failed");
    }
    setLoading(false);
  };

  return (
    <div className="card upload-card dashboard-center">
      <h2>Add Certification</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*" />
      <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill name" />
      <button onClick={submit} disabled={loading || !file || !skill} className="main-btn">
        {loading ? "Uploading..." : "Submit"}
      </button>
      <button className="logout-btn" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

function ProfileHolder({ user, onBack }) {
  const tier = getTierBadge(user.points);
  return (
    <div className="card profile-card dashboard-center">
      <h2>Your Profile</h2>
      <p>
        <b>Name:</b> {user.name}
      </p>
      <p>
        <b>Email:</b> {user.email}
      </p>
      <p>
        <b>Points:</b> {user.points}
      </p>
      <p>
        <b>Rank/Tier:</b>{" "}
        <span
          style={{
            backgroundColor: tier.color,
            color: "#222",
            borderRadius: 6,
            padding: "2px 10px",
            marginLeft: 12,
            fontWeight: "bold",
          }}
        >
          {tier.icon} {tier.label}
        </span>
      </p>
      <p>
        <b>Completed Skills:</b>
      </p>
      <ul>{user.skills && user.skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <p>
        <b>Badges:</b>
      </p>
      <ul>{user.badges && user.badges.map((b, i) => <li key={i}>{b}</li>)}</ul>
      <button className="logout-btn" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

function RoadmapGenerator({ user, onBack }) {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [roadmap, setRoadmap] = React.useState("");

  const generate = async () => {
    if (!prompt.trim()) {
      alert("Please enter your career interests or goals.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: prompt }),
      });
      if (!res.ok) throw new Error("Failed to generate roadmap");
      const data = await res.json();
      setRoadmap(data.roadmap);
    } catch (e) {
      alert(e.message || "Error generating roadmap");
    }
    setLoading(false);
  };

  return (
    <div className="card roadmap-card dashboard-center">
      <h2>Career Roadmap Generator</h2>
      <textarea
        placeholder="Describe your career interests or goals here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 12, padding: 10, borderRadius: 8, border: "1px solid #a0aec0" }}
      />
      <button className="main-btn" onClick={generate} disabled={loading}>
        {loading ? "Generating..." : "Generate Roadmap"}
      </button>
      {roadmap && (
        <div className="roadmap-output" style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: marked.parse(roadmap) }} />
      )}
      <button className="logout-btn" onClick={onBack} style={{ marginTop: 20 }}>
        Back
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("login");
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [coins, setCoins] = useState(0);
  const [skills, setSkills] = useState([]);
  const [field, setField] = useState("");
  const [guidanceText, setGuidanceText] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setProfile(null);
    setBadges([]);
    setCoins(0);
    setSkills([]);
    setField("");
    setGuidanceText("");
    setLoading(false);
  };

  const loginHandler = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.error) {
        setProfile(data);
        setField(data.field || "");
        setBadges(data.badges || []);
        setCoins(data.points || 0);
        setSkills(data.skills || []);
        if (!data.name) setPage("onboarding");
        else setPage("main");
      } else {
        alert("Login failed");
      }
    } catch {
      alert("Login failed");
    }
    setLoading(false);
  };

  const onboardingHandler = async ({ name, field }) => {
    try {
      await fetch(`${API_BASE}/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, name, field }),
      });
      setProfile((prev) => ({ ...prev, name, field }));
      setField(field);
      setPage("main");
    } catch {
      alert("Update failed");
    }
  };

  const refreshProfile = async () => {
    if (!profile?.email) return;
    try {
      const res = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(profile.email)}`);
      if (res.ok) {
        const data = await res.json();
        setBadges(data.badges || []);
        setCoins(data.points || 0);
        setSkills(data.skills || []);
        setField(data.field || "");
        setProfile((prev) => ({ ...prev, ...data }));
      }
    } catch {
      alert("Failed to fetch profile");
    }
  };

  const getGuidance = async (skillsInput, interestsInput) => {
    if (!skillsInput || !interestsInput) {
      alert("Please enter both skills and interests");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/career-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `Skills: ${skillsInput}, Interests: ${interestsInput}`,
          email: profile.email,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGuidanceText(data.adviceText);
        setPage("guidance");
      } else {
        alert("Failed to get guidance");
      }
    } catch {
      alert("Failed to get guidance");
    }
    setLoading(false);
  };

  const logout = () => {
    reset();
    setPage("login");
  };

  const navigate = (target) => {
    if (target === "logout") logout();
    else setPage(target);
  };

  // State for guidance inputs (central, not in textareas)
  const [skillsInput, setSkillsInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="background-center">
        {page === "login" && <Login onLogin={loginHandler} />}
        {page === "onboarding" && <Onboarding userProfile={profile} onComplete={onboardingHandler} />}
        {page === "main" && (
          <div className="dashboard-outer">
            <Dashboard user={profile} onNavigate={navigate} />
            <div className="card dashboard-center main-card">
              <textarea
                placeholder="Enter your skills (comma separated)"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                style={{ marginBottom: 10, width: "100%", height: 50 }}
              />
              <textarea
                placeholder="Enter your interests"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                style={{ marginBottom: 10, width: "100%", height: 50 }}
              />
              <button className="main-btn" onClick={() => getGuidance(skillsInput, interestsInput)} disabled={loading}>
                {loading ? "Loading..." : "Get Career Guidance"}
              </button>
            </div>
          </div>
        )}
        {page === "certificate" && <CertificateUpload user={profile} onBack={() => navigate("main")} onRefresh={refreshProfile} />}
        {page === "profile" && <ProfileHolder user={{ ...profile, badges, points: coins, skills }} onBack={() => navigate("main")} />}
        {page === "roadmap" && <RoadmapGenerator user={profile} onBack={() => navigate("main")} />}
        {page === "guidance" && <CareerGuidance guidance={guidanceText} onBack={() => navigate("main")} />}
      </div>

      <style>{`
  html, body, #root {
    height: 100%;
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f7fafc;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .background-center {
    min-height: 100vh;
    width: 100vw;
    box-sizing: border-box;
    background: #f7fafc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .dashboard-outer {
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;
    padding: 20px;
  }
  .dashboard-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }
  .card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 8px 20px rgba(99, 99, 99, 0.1);
    padding: 36px 44px;
    max-width: 460px;
    width: 100%;
    margin: 18px;
    text-align: center;
    transition: box-shadow 0.3s ease;
  }
  .card:hover {
    box-shadow: 0 12px 28px rgba(99, 99, 99, 0.15);
  }
  h2 {
    color: #1a202c;
    font-weight: 700;
    margin-bottom: 18px;
    font-size: 1.8rem;
  }
  p {
    color: #4a5568;
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 14px;
  }
  ul {
    text-align: left;
    margin-left: 1.2em;
    margin-bottom: 14px;
    color: #4a5568;
    font-size: 1rem;
  }
  .nav-menu-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(140px,1fr));
    grid-gap: 18px;
    margin-top: 28px;
  }
  .nav-menu-grid button,
  .main-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #ffffff;
    border: none;
    border-radius: 12px;
    padding: 14px 0;
    font-weight: 700;
    font-size: 1.1rem;
    min-width: 140px;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(103, 58, 183, 0.3);
    transition: background 0.25s ease;
  }
  .nav-menu-grid button:hover,
  .main-btn:hover {
    background: linear-gradient(135deg, #5a67d8, #6b46c1);
  }
  .logout-btn {
    grid-column: span 2;
    background: #fff !important;
    border: 2.5px solid #e53e3e;
    color: #e53e3e !important;
    font-weight: 700;
    border-radius: 12px !important;
    margin-top: 8px;
    box-shadow: none !important;
    transition: background 0.25s ease, color 0.25s ease;
  }
  .logout-btn:hover {
    background: #e53e3e !important;
    color: #fff !important;
  }
  textarea, select, input[type="text"], input[type="file"] {
    font-size: 1rem;
    border-radius: 12px;
    border: 1.8px solid #a0aec0;
    padding: 12px 14px;
    margin-bottom: 14px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.25s ease;
    color: #2d3748;
  }
  textarea:focus, select:focus, input[type="text"]:focus, input[type="file"]:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 6px #667eea99;
  }
  /* Wider and larger cards for Career Guidance & Roadmap Generator */
  .card.guidance-card,
  .card.roadmap-card {
    max-width: 900px;
    min-width: 340px;
    width: 80vw;
    min-height: 400px;
  }
  .guidance-output,
  .roadmap-output {
    background: #edf2ff;
    border-radius: 14px;
    padding: 26px 32px;
    margin-top: 16px;
    font-size: 1.08rem;
    color: #2c3e50;
    text-align: left;
    word-break: break-word;
    line-height: 1.7;
    white-space: pre-wrap;
    min-height: 120px;
    box-shadow: inset 0 0 6px #6666cc33;
  }
  button:disabled,
  .main-btn:disabled,
  .nav-menu-grid button:disabled {
    background: #cbd5e0 !important;
    cursor: not-allowed;
    box-shadow: none !important;
    color: #718096 !important;
  }
`}</style>
    </GoogleOAuthProvider>
  );
}
