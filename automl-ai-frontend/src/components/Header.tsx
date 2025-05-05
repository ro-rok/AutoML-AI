interface Props { onLogoClick: () => void }

export default function Header({ onLogoClick }: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 bg-black z-20 flex items-center justify-center"
    >
      <h1
        onClick={onLogoClick}
        className="text-red-500 text-xl font-bold cursor-pointer select-none"
      >
        AutomatedML AI
      </h1>
    </header>
  )
}