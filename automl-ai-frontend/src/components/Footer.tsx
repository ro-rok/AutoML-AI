import { FiGithub } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="w-full h-10 bg-black fixed bottom-0 z-50 flex items-center justify-center text-gray-500 text-xs">
      <a
        href="https://github.com/ro-rok"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-red-500 transition-colors"
      >
        <FiGithub /> AutomatedML AI by Rohan © {new Date().getFullYear()}
      </a>
    </footer>
  )
}
