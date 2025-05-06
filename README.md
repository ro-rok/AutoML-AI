# 🚀 AutomatedML AI

> End-to-end visual machine learning powered by AI assistance – from raw data to deployed models.

---

## 🌐 Website

👉 [https://automated-ml-ai.vercel.app/](https://automated-ml-ai.vercel.app/) — Check our website!

# AutomatedML AI

![Logo](/automl-ai-frontend/src/assets/bg1.webp)

**AutomatedML AI** is a single-page React + FastAPI application that guides you through building end-to-end machine-learning pipelines — from data upload, EDA, cleaning & transformation, to model training and export — all with an AI assistant at your side.

---

## 🚀 Features

- **Upload** CSV / Excel datasets  
- **EDA**: Correlation, skewness, distributions & interactive graphs  
- **Cleaning**: Fill or drop missing values, preview before/after  
- **Transformation**: Encoding, scaling, skew‑correction, class balancing  
- **Model Training**: Logistic, Random Forest, XGBoost, LightGBM, SVM, KNN, Naive Bayes, etc. with hyperparameter tuning  
- **AI Chat Assistant**: Context‑aware suggestions powered by streaming GPT‑style API  
- **Export**: Download reproducible PDF reports and Jupyter notebooks  
- **Pipeline Navigator**: Animated Travelator Background & swipeable panels for showing where are we in pipeline  
- **Continuous Deployment**: Automated GitHub Actions workflows  
- **Containerization**: Dockerfiles for reproducible builds  

---

## 🛠️ Tech Stack

- **Frontend**  
  - React (Vite) + TypeScript  
  - Tailwind CSS  
  - Framer Motion & GSAP  
  - Zustand for state management  
- **Backend**  
  - FastAPI + Pydantic  
  - Pandas, NumPy, scikit‑learn, fpdf2, nbformat
  - Supabase (PostgreSQL + optional Auth)
  - Matplotlib & Seaborn
- **Infrastructure & DevOps**  
  - Docker & multi‑stage builds  
  - GitHub Actions for CI/CD  
  - Heroku & Vercel hosting  
- **APIs & Tools**  
  - GROQ AI streaming for chat suggestions  
  - Supabase for optional session persistence  

## 📊 WakaTime

**⏰ Development Time:** At the time of hosting, nearly all features were built in 44+ hours.

![WakaTime Stats](/automl-ai-frontend/public/waka.png)

---

## 📥 Installation

1. **Clone repository**  
   ```bash
   git clone https://github.com/ro-rok/automl-ai.git
   cd automatedml-ai
   ```

2. **Backend**  
   ```bash
   cd automl-ai-backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   echo "GROQ_API_KEY=your_groq_api_key" > .env
   echo "SUPA_BASE=your_supabase_kets" > .env
   uvicorn app.main:app --reload
   ```
   Runs FastAPI on http://localhost:8000

3. **Frontend**  
   ```bash
   cd ../automl-ai-frontend
   npm install
   npm run dev
   ```
   Runs Vite dev server on http://localhost:5173

---

## ⚙️ Configuration

- **Backend**: Add `GROQ_API_KEY` to `.env`  
- **Frontend**: Update `baseURL` in `src/api/client.ts` to point to your backend.

---

## 🚧 Usage

1. Upload your CSV/XLSX file.  
2. Explore EDA charts and summaries.  
3. Clean missing values and preview changes.  
4. Transform data (encoding, scaling, balancing).  
5. Train models and view evaluation metrics.  
6. Export PDF reports or Jupyter notebooks.  
7. Use the Chat Assistant for AI-driven guidance.

---

## 📂 Project Structure

```

automl-ai-backend/
├─ app/
│  ├─ main.py            # FastAPI app & routers
│  ├─ routes/            # upload, pipeline, export, graph, groq
│  ├─ utils/             # graph_utils, models, groq_assistant, preprocessing, export_utils
│  └─ ...

automl-ai-frontend/
├─ public/
│  └─ sample/            # Sample CSV/XLSX
├─ src/
│  ├─ assets/            # bg1.webp (logo), waka.png
│  ├─ components/
│  │  ├─ PipelineNavigator.tsx
│  │  ├─ ChatAssistant.tsx
│  │  ├─ Header.tsx
│  │  └─ Footer.tsx
│  ├─ pages/             # UploadPage, EDAPage, CleanPage, TransformPage, TrainPage, ExportPage
│  ├─ store/             # useSessionStore, useStepStore
│  ├─ api/               # axios client
│  ├─ index.css
│  └─ App.tsx

```
---

## 🤝 Contributing

- Fork the repo & create your feature branch  
- Commit your changes & push  
- Open a Pull Request  

---

## 📄 License

MIT © Rohan Khanna
