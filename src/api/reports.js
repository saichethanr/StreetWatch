import { supabase } from '../supabaseClient'

// Only the fields the map markers need.
export async function fetchActiveReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('id, category, latitude, longitude, days_ignored')
    .eq('status', 'active')
  if (error) throw error
  return data
}

export async function fetchReport(id) {
  const { data, error } = await supabase
    .from('reports')
    // report_upvotes also links reports to profiles, so name the reporter's foreign key.
    .select('*, reporter:profiles!reports_user_id_fkey(username)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchComments(reportId) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, comment_text, created_at, author:profiles(username, avatar_url)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Calls onInsert whenever someone comments on the report. Returns an unsubscribe function.
export function subscribeToComments(reportId, onInsert) {
  const channel = supabase
    .channel(`comments:${reportId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments', filter: `report_id=eq.${reportId}` },
      onInsert,
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
