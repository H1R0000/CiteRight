import { useApp } from '../app/AppProvider'
export function StyleSelector() {
  const { style, setStyle } = useApp()
  return (
    <div className="style-switch" role="group" aria-label="Citation style">
      <button type="button" aria-pressed={style === 'apa'} onClick={() => setStyle('apa')}>
        APA <span>7</span>
      </button>
      <button type="button" aria-pressed={style === 'mla'} onClick={() => setStyle('mla')}>
        MLA <span>9</span>
      </button>
    </div>
  )
}
