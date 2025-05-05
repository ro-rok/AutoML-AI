import { motion } from 'framer-motion'
import {
  FiUploadCloud,
  FiBarChart2,
  FiTrash2,
  FiRepeat,
  FiCpu,
  FiDownload,
} from 'react-icons/fi'

interface Props {
  onEnter: () => void
}

const features = [
  { title: 'Upload Data', desc: 'Import CSV or Excel files to start your pipeline.', Icon: FiUploadCloud },
  { title: 'Exploratory Data Analysis', desc: 'View correlations, skewness, and distributions.', Icon: FiBarChart2 },
  { title: 'Data Cleaning', desc: 'Handle missing values: mean, median, mode or drop.', Icon: FiTrash2 },
  { title: 'Data Transformation', desc: 'Encode, scale, correct skew, balance classes.', Icon: FiRepeat },
  { title: 'Model Training', desc: 'Train Logistic, Random Forest, XGBoost & more.', Icon: FiCpu },
  { title: 'Export Results', desc: 'Generate PDF reports & reproducible notebooks.', Icon: FiDownload },
]

const supportedModels = [
  'Logistic Regression',
  'Random Forest',
  'Decision Tree',
  'KNN',
  'SVM',
  'XGBoost',
  'LightGBM',
  'Naive Bayes',
]

export default function HomePage({ onEnter }: Props) {
    return (
      <div
        className="
          bg-black text-white
          min-h-screen
          overflow-x-hidden
          overflow-y-auto
          scroll-smooth
        "
      >
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center py-20 px-6">
          <motion.h1
            className="text-4xl sm:text-6xl font-extrabold text-red-500 mb-4 leading-tight text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            AutomatedML AI
          </motion.h1>
          <motion.p
            className="max-w-xl text-center text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Build end-to-end ML pipelines with AI guidance—upload, explore, clean,
            transform, train and export in one seamless flow.
          </motion.p>
          <motion.button
            onClick={onEnter}
            className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-full font-semibold shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
          >
            🚀 Get Started
          </motion.button>
        </section>
  
        {/* Features Grid */}
        <section className="py-20 px-6">
          <motion.div
            className="max-w-screen-lg mx-auto grid grid-cols-1 md:grid-cols-2 gap-8"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {features.map(({ title, desc, Icon }, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center p-6 bg-gray-900 rounded-lg shadow-lg"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <Icon className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-gray-400">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>
  
        {/* Supported Models */}
        <section className="py-20 px-6">
          <motion.div
            className="max-w-screen-md mx-auto text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-red-500 mb-6">
              Supported Models
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {supportedModels.map((m, i) => (
                <motion.li
                  key={i}
                  className="bg-gray-900 p-4 rounded-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  {m}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>
      </div>
    )
  }