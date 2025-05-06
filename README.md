# 🚀 AutomatedML AI

> End-to-end visual machine learning powered by AI assistance – from raw data to deployed models.

---

## 🌐 Website

👉 [https://automatedml.ai](#) — _Coming Soon_

---

## 🖼 Logo Placeholder

<p align="center">
  <img src="<!-- YOUR_LOGO_PATH_HERE -->" alt="AutomatedML AI Logo" width="200"/>
</p>

---

## 📊 WakaTime Stats

![WakaTime](<!-- YOUR_WAKATIME_STATS_IMAGE_URL_HERE -->)

---

## 📦 Repositories

- [`Frontend`](./automl-ai-frontend) — UI with React, Vite, Tailwind, GSAP, Groq Assistant
- [`Backend`](./automl-ai-backend) — FastAPI-based backend for ML pipeline automation

---

# 🧠 Frontend – AutomatedML AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vercel](https://img.shields.io/badge/deploying%20on-Vercel-black?logo=vercel)
![Made with Vite](https://img.shields.io/badge/built%20with-Vite-blueviolet?logo=vite)
![Powered by Groq](https://img.shields.io/badge/AI%20Powered%20By-Groq%20LLaMA-red?logo=openai)

<p align="center">
  <img src="./automl-ai-frontend/src/assets/AI-Robot.webp" alt="AutomatedML AI Frontend" width="400"/>
</p>

### 🎯 Features

- Smart, streaming AI assistant (Groq) for every ML stage
- Graph Builder: histogram, heatmap, SHAP, ROC, etc.
- Cleaner: schema preview, null filler, target auto-detection
- Transform: scaling, encoding, SMOTE, constraints
- Trainer: model picker, hyperparameter UI, evaluation results

### 🛠 Tech Stack

- React + Vite, Tailwind CSS, Zustand, GSAP
- Axios + FastAPI for assistant streaming
- Groq LLaMA backend integration

### 🚀 Quickstart

```bash
git clone https://github.com/your-org/automl-ai-frontend.git
cd automl-ai-frontend
npm install
npm run dev
```

⚠️ Requires backend running at `http://localhost:8000`.

---

# 🔧 Backend – AutoML-AI

🎯 AI-assisted backend for supervised ML – FastAPI + Groq.

### 🚀 Features

- Upload + Schema Preview (CSV/XLSX)
- EDA: correlation, skew, class balance
- Cleaning: null fill/drop
- Transformations: encode, scale, SMOTE
- Train: Logistic, RF, SVM, XGBoost, LGBM, etc.
- Export: PDF + Notebook
- Groq Assistant suggestions per step

### 🧱 Tech Stack

- FastAPI, Scikit-learn, SHAP, fpdf2, nbformat
- Supabase (PostgreSQL + optional Auth)
- Deployed via Heroku (eco tier)

### ▶️ Run Locally

```bash
git clone https://github.com/your-org/automl-ai-backend.git
cd automl-ai-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

.env example:

```env
GROQ_API_KEY=your_groq_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

### 📬 Routes Summary

| Endpoint | Description |
|----------|-------------|
| `/upload/file` | Upload & preview dataset |
| `/pipeline/eda` | Run EDA on dataset |
| `/pipeline/clean` | Fill/drop missing values |
| `/pipeline/transform` | Encode/scale data |
| `/pipeline/train` | Train & evaluate model |
| `/export/pdf` | Generate PDF report |
| `/export/ipynb` | Download Jupyter notebook |
| `/groq/suggest` | Get AI-based step suggestion |

---

## 📄 License

MIT © 2025 Rohan

---