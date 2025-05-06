# 🚀 AutomatedML AI – Frontend

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vercel](https://img.shields.io/badge/deploying%20on-Vercel-black?logo=vercel)
![Made with Vite](https://img.shields.io/badge/built%20with-Vite-blueviolet?logo=vite)
![Powered by Groq](https://img.shields.io/badge/AI%20Powered%20By-Groq%20LLaMA-red?logo=openai)

Welcome to the **Frontend** of **AutomatedML AI** – a sleek, intelligent UI for building end-to-end machine learning pipelines. From raw data to trained models, this project gives you a smart, animated, and assistant-driven ML experience.

Built using **React + Vite**, styled with **Tailwind CSS**, and powered by **Groq’s LLaMA**, this project blends performance with delightful interactivity.

<p align="center">
  <img src="./src/assets/AI-Robot.webp" alt="AutomatedML AI" width="400"/>
</p>

---

## 🌐 Live Preview

> Coming soon on **[Vercel](https://vercel.com/)** 🚀

---

## 🎯 Features

- 🧠 **AI Assistant:** Smart, streaming Groq-powered chat assistant per ML stage (EDA, Clean, Transform, Train).
- 📈 **Graph Builder:** Full-screen fancy plots – histograms, heatmaps, boxplots, ROC curves, SHAP, etc.
- 🧼 **Data Cleaner:** Visual schema picker with automatic target detection and null-handling strategies.
- 🧪 **Transformations:** Encoding, scaling, imbalance handling – tabbed UI and form constraints built-in.
- 🤖 **Pipeline Navigator:** Animated, black-themed GSAP-driven pipeline with arrows and step highlights.
- 🗂️ **Upload & EDA:** CSV/XLSX preview, type inference, null visualization, and AI-driven EDA summary.
- ⚙️ **Model Trainer:** Interactive model carousel, radio-style hyperparameters, and evaluation visualizations.

---

## 🛠️ Tech Stack

| Layer          | Tech Used                            |
|----------------|--------------------------------------|
| Framework      | Vite + React                         |
| Styling        | Tailwind CSS                         |
| State Mgmt     | Zustand                              |
| Animation      | GSAP, Headless UI                    |
| AI Assistant   | Groq (LLaMA) via FastAPI             |
| Streaming Chat | Axios + FastAPI StreamingResponse    |

---

## 📂 Folder Structure

```bash
automl-ai-frontend/
│
├── src/
│   ├── pages/          # Upload, Clean, Transform, Train, EDA, Export
│   ├── components/     # ChatAssistant, Navigator, Footer, Graphs
│   ├── store/          # Zustand store for sessions, states
│   ├── assets/         # Images, SVGs, backgrounds
│   ├── api/            # Axios base client
│   └── index.css       # Global Tailwind styles
│
├── tailwind.config.js
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/automl-ai-frontend.git
cd automl-ai-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

> ⚠️ Make sure the backend is running at `http://localhost:8000`

### 🔧 Configuration

No `.env` required unless you're changing the backend URL. You can update it in `src/api/client.ts`.

---

## 💡 Contribution Guide

We welcome all kinds of contributions! You can:

- 🎨 Improve UI/UX animations or dark/light themes
- 💬 Enhance assistant tips and interactions
- 📊 Add new visualizations or model explainers
- ♿ Improve accessibility for all users

### How to Contribute

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Commit and push
git commit -m "feat(ui): improved assistant layout"
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub 🙌

---

## 📸 Screenshots

> (Coming soon once final visual UI is published)

---

## 📄 License

MIT License © 2025 [Your Name]

---

## 🧠 Powered By

- [Groq LLaMA](https://groq.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [GSAP Animations](https://greensock.com/gsap/)

---