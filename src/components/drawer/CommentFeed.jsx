import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { fetchComments, subscribeToComments } from '../../api/reports'

// Same format as the profiles.username check constraint.
const MENTION = /(@[a-z0-9_]{3,30})/g

export default function CommentFeed({ reportId }) {
  const [comments, setComments] = useState(null)

  useEffect(() => {
    let ignore = false
    const load = () => fetchComments(reportId).then((data) => !ignore && setComments(data), console.error)
    load()
    // Realtime rows lack the joined author, so refetch the feed on each new comment.
    const unsubscribe = subscribeToComments(reportId, load)
    return () => {
      ignore = true
      unsubscribe()
    }
  }, [reportId])

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MessageSquare size={16} />
        Community discussion
        {comments && <span className="font-normal text-slate-500">({comments.length})</span>}
      </h3>

      {comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}

      <ul className="space-y-3">
        {comments?.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <Avatar author={comment.author} />
            <div className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-900">
                  @{comment.author.username}
                </span>
                <time className="shrink-0 text-[11px] text-slate-500" dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                {comment.comment_text.split(MENTION).map((part, i) =>
                  i % 2 === 1 ? (
                    <span key={i} className="font-medium text-blue-600">
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Avatar({ author }) {
  if (author.avatar_url) {
    return <img src={author.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold uppercase text-slate-700">
      {author.username[0]}
    </span>
  )
}
