import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { coverUrl } from '../lib/open-library'
export function BookCover({
  id,
  title,
  small = false,
}: {
  id?: number
  title: string
  small?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`book-cover ${small ? 'book-cover-small' : ''}`}>
      {id && !failed ? (
        <img
          src={coverUrl(id)}
          alt={`Cover of ${title}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-placeholder">
          <BookOpen size={small ? 22 : 30} aria-hidden="true" />
          <span>{title || 'Your next idea'}</span>
        </div>
      )}
    </div>
  )
}
