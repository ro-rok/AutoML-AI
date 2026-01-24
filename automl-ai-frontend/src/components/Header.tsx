import { useNavigate } from 'react-router-dom'
import OptimizedImage from './OptimizedImage'
import favLogo from '../assets/fav.png'

interface Props { onLogoClick: () => void }

export default function Header({ onLogoClick }: Props) {
  const navigate = useNavigate()

  const handleLogoClick = () => {
    onLogoClick()
    navigate('/')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-sm border-b border-border-default z-20 flex items-center justify-center"
    >
      <div
        onClick={handleLogoClick}
        className="flex items-center gap-3 cursor-pointer select-none hover:opacity-80 transition-opacity"
      >
        <OptimizedImage
          src={favLogo}
          alt="AutomatedML AI Logo"
          className="w-8 h-8 object-contain"
          width={32}
          height={32}
        />
        <h1 className="text-red-500 text-xl font-bold">
          AutomatedML AI
        </h1>
      </div>
    </header>
  )
}